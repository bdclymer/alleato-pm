"""
Microsoft Graph API Client
Handles OAuth 2.0 client credentials flow and HTTP requests.
"""
import os
import time
import logging
import httpx
from typing import Any, Optional

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"


class GraphClient:
    """Microsoft Graph API client with automatic token refresh."""

    def __init__(self):
        self.client_id = os.environ.get("MICROSOFT_CLIENT_ID", "")
        self.client_secret = os.environ.get("MICROSOFT_CLIENT_SECRET", "")
        self.tenant_id = os.environ.get("MICROSOFT_TENANT_ID", "")
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.tenant_id)

    def _get_token(self) -> str:
        """Return cached token or fetch a new one."""
        if self._token and time.time() < self._token_expiry - 60:
            return self._token

        url = TOKEN_URL.format(tenant_id=self.tenant_id)
        resp = httpx.post(url, data={
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default",
        }, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        self._token_expiry = time.time() + int(data.get("expires_in", 3600))
        return self._token

    def get(self, path: str, params: Optional[dict] = None) -> dict:
        """GET request to Graph API. `path` can be full URL or relative path."""
        url = path if path.startswith("https://") else f"{GRAPH_BASE}{path}"
        headers = {"Authorization": f"Bearer {self._get_token()}"}
        resp = httpx.get(url, headers=headers, params=params, timeout=60)
        resp.raise_for_status()
        return resp.json()

    def get_all_pages(self, path: str, params: Optional[dict] = None) -> list[dict]:
        """Fetch all pages following @odata.nextLink."""
        results = []
        first_url = path if path.startswith("https://") else f"{GRAPH_BASE}{path}"
        url: Optional[str] = first_url
        is_first = True
        while url:
            data = self.get(url, params if is_first else None)
            is_first = False
            results.extend(data.get("value", []))
            url = data.get("@odata.nextLink")
        return results

    def get_delta(self, path: str, delta_token: Optional[str] = None) -> tuple[list[dict], str]:
        """
        Fetch delta results. Returns (items, new_delta_token).
        On first call, pass delta_token=None to get all items + initial delta token.
        On subsequent calls, pass the saved delta token to get only changes.
        """
        if delta_token:
            # delta_token is a full URL from the previous @odata.deltaLink
            url: Optional[str] = delta_token
        else:
            url = path if path.startswith("https://") else f"{GRAPH_BASE}{path}"

        items = []
        new_delta_token = ""
        current_url = url

        while current_url:
            data = self.get(current_url)
            items.extend(data.get("value", []))
            if "@odata.nextLink" in data:
                current_url = data["@odata.nextLink"]
            elif "@odata.deltaLink" in data:
                new_delta_token = data["@odata.deltaLink"]
                current_url = None
            else:
                current_url = None

        return items, new_delta_token

    def download_bytes(self, url: str) -> bytes:
        """Download a file's raw bytes (for OneDrive content)."""
        headers = {"Authorization": f"Bearer {self._get_token()}"}
        resp = httpx.get(url, headers=headers, timeout=120, follow_redirects=True)
        resp.raise_for_status()
        return resp.content


# Singleton
_client: Optional[GraphClient] = None


def get_graph_client() -> GraphClient:
    global _client
    if _client is None:
        _client = GraphClient()
    return _client
