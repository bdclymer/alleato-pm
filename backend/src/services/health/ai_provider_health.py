"""
AI Provider Health Check

Canary for the backend LLM provider (AI Gateway by default, direct OpenAI
fallback, via ``src.services.ai_transport.get_openai_client``). The backend intelligence
pipeline — meeting deep-extraction, project synthesizer, Teams/email compilers,
task extraction — funnels every LLM call through that client and swallows
failures into empty results (``_extraction_failed``). When the OpenAI account
runs out of quota (HTTP 429 ``insufficient_quota``) or the key is revoked
(HTTP 401), the whole pipeline goes silently dark — exactly what happened for
~5 days ending 2026-06-14 (see memory: incident-openai-quota-backend-ai-down).

This module makes that failure LOUD: it issues a cheap 1-token completion and
classifies the result so a quota/auth/billing problem surfaces within hours
(via the cron in render.yaml) instead of days.

``check_ai_provider_health()`` returns:
    {
        "status": "ok" | "down",
        "model":  <model probed>,
        "reason": "insufficient_quota" | "auth" | "rate_limit"
                  | "connection" | "unknown" | "missing_key" | None,
        "http_status": <int | None>,
        "detail": <short error string | None>,
    }

Run as ``python3 -m src.services.health.ai_provider_health``: prints the result,
posts a Slack alert on failure (if SLACK_WEBHOOK_URL is set), and exits non-zero
so Render shows the cron as failed.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Cheap probe model — overridable so the check can track whatever the pipeline
# actually uses without a code change. gpt-4o-mini is the cheapest chat model
# and shares the same account quota as the frontier models the pipeline calls,
# so a quota failure here proves a quota failure everywhere.
AI_PROVIDER_HEALTH_MODEL = os.getenv("AI_PROVIDER_HEALTH_MODEL", "gpt-4o-mini")
PROBE_TIMEOUT_SECONDS = int(os.getenv("AI_PROVIDER_HEALTH_TIMEOUT_SECONDS", "20"))


def _classify_exception(exc: Exception) -> dict[str, Any]:
    """Map an OpenAI SDK exception to a (reason, http_status) verdict.

    Distinguishes the three failure modes the incident showed are easy to
    confuse: insufficient_quota (billing — account out of credits), auth (key
    revoked/invalid), and a genuine transient rate_limit. All three arrive as
    HTTP 429 or 401, so we inspect the error *code* in the response body, not
    just the status.
    """
    status_code = getattr(exc, "status_code", None)

    # Pull the provider error code out of the SDK exception body when present.
    error_code = ""
    error_message = ""
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        err = body.get("error")
        if isinstance(err, dict):
            error_code = str(err.get("code") or err.get("type") or "")
            error_message = str(err.get("message") or "")
    if not error_code:
        # openai.APIStatusError exposes .code directly on newer SDKs.
        error_code = str(getattr(exc, "code", "") or "")

    haystack = f"{error_code} {error_message} {exc}".lower()

    if "insufficient_quota" in haystack or "exceeded your current quota" in haystack:
        return {"reason": "insufficient_quota", "http_status": status_code or 429}
    if status_code == 401 or "invalid_api_key" in haystack or "authentication" in haystack:
        return {"reason": "auth", "http_status": status_code or 401}
    if status_code == 429 or "rate_limit" in haystack or "rate limit" in haystack:
        return {"reason": "rate_limit", "http_status": status_code or 429}
    if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError, httpx.ProtocolError)):
        return {"reason": "connection", "http_status": status_code}
    # The OpenAI SDK wraps connection problems in APIConnectionError.
    if "connection" in haystack or "timeout" in haystack or "timed out" in haystack:
        return {"reason": "connection", "http_status": status_code}
    return {"reason": "unknown", "http_status": status_code}


def check_ai_provider_health(model: str = AI_PROVIDER_HEALTH_MODEL) -> dict[str, Any]:
    """Probe the backend OpenAI client with a 1-token completion.

    Never raises — returns a verdict dict. status="down" means the backend
    intelligence pipeline cannot reach the LLM provider right now.
    """
    from src.services.ai_transport import (
        ai_gateway_configured,
        get_ai_provider_path,
        openai_configured,
    )

    provider_path = get_ai_provider_path()
    if provider_path == "vercel_gateway" and not ai_gateway_configured():
        return {
            "status": "down",
            "model": model,
            "provider_path": provider_path,
            "reason": "missing_key",
            "http_status": None,
            "detail": "AI_GATEWAY_API_KEY is not set on this service",
        }
    if provider_path == "openai" and not openai_configured():
        return {
            "status": "down",
            "model": model,
            "provider_path": provider_path,
            "reason": "missing_key",
            "http_status": None,
            "detail": "OPENAI_API_KEY is not set on this service",
        }

    try:
        from src.services.ai_transport import get_openai_client

        client = get_openai_client()
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
            timeout=PROBE_TIMEOUT_SECONDS,
        )
        # A successful response object with at least one choice means the
        # provider accepted the request and billed it — the account is live.
        _ = response.choices[0].message
        return {
            "status": "ok",
            "model": model,
            "provider_path": provider_path,
            "reason": None,
            "http_status": 200,
            "detail": None,
        }
    except Exception as exc:  # noqa: BLE001 — health check must classify, not crash
        verdict = _classify_exception(exc)
        logger.error(
            "[AIProviderHealth] probe failed model=%s reason=%s http=%s: %s",
            model,
            verdict["reason"],
            verdict["http_status"],
            exc,
        )
        return {
            "status": "down",
            "model": model,
            "provider_path": provider_path,
            "reason": verdict["reason"],
            "http_status": verdict["http_status"],
            "detail": str(exc)[:300],
        }


_REASON_MESSAGE = {
    "insufficient_quota": (
        "OpenAI account is OUT OF QUOTA (insufficient_quota). The backend "
        "intelligence pipeline (meeting extraction, synthesizer, compilers, "
        "task extraction) is silently producing nothing. Top up the OpenAI "
        "account or it stays dark."
    ),
    "auth": (
        "OpenAI rejected the API key (401). Backend AI is down until "
        "OPENAI_API_KEY is fixed on alleato-backend."
    ),
    "rate_limit": (
        "OpenAI is rate-limiting the backend (429 rate_limit). Likely "
        "transient, but backend extraction is degraded while it persists."
    ),
    "connection": "Could not reach api.openai.com from the backend (network/timeout).",
    "missing_key": "OPENAI_API_KEY is not set on the backend service.",
    "unknown": "Backend OpenAI probe failed for an unclassified reason.",
}


def _alert_text(result: dict[str, Any]) -> str:
    reason = result.get("reason") or "unknown"
    headline = _REASON_MESSAGE.get(reason, _REASON_MESSAGE["unknown"])
    return (
        f":rotating_light: *Backend AI Provider DOWN* "
        f"(reason=`{reason}`, http=`{result.get('http_status')}`, model=`{result.get('model')}`)\n"
        f"{headline}\n"
        f"detail: {result.get('detail')}"
    )


def _post_slack(webhook_url: str, result: dict[str, Any]) -> None:
    try:
        httpx.post(webhook_url, json={"text": _alert_text(result)}, timeout=10)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Slack notification failed: %s", exc)


# Default Teams alert recipient — Megan's Supabase user id. Override with
# AI_HEALTH_ALERT_TEAMS_USER_ID so the recipient can change without a code edit.
_DEFAULT_ALERT_TEAMS_USER_ID = "1854b4b0-3e8e-4d69-86df-32cdb3c80ee0"


def _teams_text(result: dict[str, Any]) -> str:
    """Plain-text alert for a Teams DM (no Slack markdown / emoji codes)."""
    reason = result.get("reason") or "unknown"
    headline = _REASON_MESSAGE.get(reason, _REASON_MESSAGE["unknown"])
    return (
        f"⚠️ Backend AI is DOWN — reason: {reason} "
        f"(http {result.get('http_status')}, probe model {result.get('model')}).\n\n"
        f"{headline}\n\n"
        f"detail: {result.get('detail')}\n"
        f"checked at {result.get('checked_at')}"
    )


def _post_teams(result: dict[str, Any]) -> bool:
    """Send the alert as a Teams DM via the frontend proactive-bot bridge.

    Slack alerts already fire, but the channel isn't actively watched — a quota
    burn went unnoticed for half a day. This routes the same alert to Teams, where
    the owner actually is. Best-effort; never raises. Requires
    NOTIFICATION_SERVICE_KEY + the app base URL (NEXT_PUBLIC_APP_URL) on the cron.
    """
    base_url = (
        os.getenv("NEXT_PUBLIC_APP_URL")
        or os.getenv("APP_BASE_URL")
        or "https://projects.alleatogroup.com"
    ).rstrip("/")
    service_key = os.getenv("NOTIFICATION_SERVICE_KEY")
    user_id = os.getenv("AI_HEALTH_ALERT_TEAMS_USER_ID", _DEFAULT_ALERT_TEAMS_USER_ID)
    if not service_key:
        logger.warning("[AIProviderHealth] NOTIFICATION_SERVICE_KEY not set — cannot send Teams alert")
        return False
    try:
        resp = httpx.post(
            f"{base_url}/api/bot/proactive/teams",
            headers={"Authorization": f"Bearer {service_key}"},
            json={"userId": user_id, "message": _teams_text(result)},
            timeout=15,
        )
        if resp.status_code >= 400:
            logger.warning("[AIProviderHealth] Teams alert HTTP %s: %s", resp.status_code, resp.text[:200])
            return False
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("[AIProviderHealth] Teams notification failed: %s", exc)
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stderr)

    result = check_ai_provider_health()
    result["checked_at"] = datetime.now(timezone.utc).isoformat()
    print(json.dumps(result, indent=2))

    if result["status"] != "ok":
        reason = result.get("reason") or "unknown"
        print(
            f"\nAI PROVIDER HEALTH: DOWN ({reason}) — {_REASON_MESSAGE.get(reason, '')}",
            file=sys.stderr,
        )
        # Fan out to every configured channel. Teams is the one the owner actually
        # watches; Slack stays as a secondary record. Both are best-effort.
        slack_url = os.getenv("SLACK_WEBHOOK_URL")
        if slack_url:
            _post_slack(slack_url, result)
        teams_sent = _post_teams(result)
        print(
            f"alerts sent — slack={'yes' if slack_url else 'no-webhook'}, teams={'yes' if teams_sent else 'failed'}",
            file=sys.stderr,
        )
        sys.exit(1)

    print("\nAI provider health: OK", file=sys.stderr)
