from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


# Load backend/.env for local development. Real production platforms should
# still provide secrets via environment variables.
BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


def env(name: str, default: str | None = None) -> str | None:
    return os.getenv(name, default)