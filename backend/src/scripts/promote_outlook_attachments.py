#!/usr/bin/env python3
"""Promote queued Outlook intake attachments into project documents."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def main() -> int:
    _load_backend()

    parser = argparse.ArgumentParser(description="Promote Outlook intake attachments into project documents")
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    from src.services.integrations.microsoft_graph.attachment_promotion import (
        promote_outlook_intake_attachments,
    )
    from src.services.supabase_helpers import get_supabase_client

    result = promote_outlook_intake_attachments(get_supabase_client(), limit=args.limit)
    print(json.dumps(result, indent=2, default=str))
    return 1 if result.get("failed") else 0


if __name__ == "__main__":
    raise SystemExit(main())
