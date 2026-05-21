import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi import HTTPException

from src.api.main import _configured_cors_origins, _verify_schedule_convert_token
from src.services.microsoft_project_parser import _is_missing_java_runtime_error


def _token(secret: str, payload: dict) -> str:
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("ascii").rstrip("=")
    signature = base64.urlsafe_b64encode(
        hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    ).decode("ascii").rstrip("=")
    return f"{encoded}.{signature}"


def test_schedule_convert_token_accepts_matching_project(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-secret")
    token = _token("test-secret", {"project_id": 25125, "exp": int(time.time()) + 60})

    _verify_schedule_convert_token(token, 25125)


def test_missing_java_runtime_detection_handles_local_macos_jpype_error():
    assert _is_missing_java_runtime_error("Command '['/usr/libexec/java_home']' returned non-zero exit status 1.")


def test_schedule_convert_token_rejects_project_mismatch(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-secret")
    token = _token("test-secret", {"project_id": 25125, "exp": int(time.time()) + 60})

    with pytest.raises(HTTPException) as exc:
        _verify_schedule_convert_token(token, 983)

    assert exc.value.status_code == 401
    assert "does not match" in exc.value.detail


def test_schedule_convert_token_rejects_expired_token(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-secret")
    token = _token("test-secret", {"project_id": 25125, "exp": int(time.time()) - 1})

    with pytest.raises(HTTPException) as exc:
        _verify_schedule_convert_token(token, 25125)

    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail


def test_configured_cors_origins_includes_production_project_host(monkeypatch):
    monkeypatch.delenv("FRONTEND_CORS_ORIGINS", raising=False)

    assert "https://projects.alleatogroup.com" in _configured_cors_origins()
