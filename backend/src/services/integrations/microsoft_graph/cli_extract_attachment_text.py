"""CLI bridge for Microsoft Graph attachment text extraction.

This intentionally wraps the existing OneDrive/Outlook extractor instead of
adding a second PDF/DOCX parsing stack in Node.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

from .onedrive import SUPPORTED_EXTENSIONS, _extract_text


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract text from a Microsoft Graph attachment file.")
    parser.add_argument("--path", required=True, help="Local path to the downloaded attachment.")
    parser.add_argument("--name", required=True, help="Original attachment file name.")
    args = parser.parse_args()

    _, extension = os.path.splitext(args.name)
    extension = extension.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        print(
            json.dumps(
                {
                    "status": "unsupported",
                    "text": "",
                    "file_type": extension.lstrip("."),
                    "warnings": [f"Unsupported extension: {extension or '(none)'}"],
                }
            )
        )
        return 0

    try:
        with open(args.path, "rb") as file:
            content = file.read()
        text = _extract_text(content, extension).replace("\x00", "").strip()
        print(
            json.dumps(
                {
                    "status": "ok",
                    "text": text,
                    "file_type": extension.lstrip("."),
                    "warnings": [] if text else ["No text extracted"],
                }
            )
        )
        return 0
    except Exception as exc:
        print(json.dumps({"status": "error", "text": "", "error": str(exc)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
