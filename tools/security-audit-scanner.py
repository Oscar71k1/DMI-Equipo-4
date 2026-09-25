#!/usr/bin/env python3
"""
Detector de secretos ampliado - Auditoria de seguridad Semana 4 (Jarumi).

Este script es un COMPLEMENTO propio, independiente del evaluador oficial
del curso (tools/course_public_evaluator.py), que no se modifica.

Motivo: el detector oficial (SECRET_PATTERNS) solo reconoce claves privadas,
tokens de GitHub, claves de AWS y nombres de variables EXPO_PUBLIC_*SECRET.
No reconoce tokens de texto plano usados como credenciales fijas dentro del
codigo, como 'Bearer course-valid-token' en course-backend/server.mjs.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {".git", ".expo", "node_modules", "coverage", "dist", "android", "ios"}

EXTENDED_PATTERNS = {
    "hardcoded_bearer_token": re.compile(r"Bearer\s+[A-Za-z0-9_-]{6,}"),
    "hardcoded_password_literal": re.compile(r"password\s*[:=]\s*['\"][^'\"]{4,}['\"]", re.IGNORECASE),
}


def scan_extended_secrets(repo: Path) -> list[str]:
    hits: list[str] = []
    for path in repo.rglob("*"):
        if not path.is_file() or any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".zip", ".apk", ".aab"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for name, pattern in EXTENDED_PATTERNS.items():
            if pattern.search(text):
                hits.append(f"{path.relative_to(repo)}:{name}")
    return hits


if __name__ == "__main__":
    findings = scan_extended_secrets(ROOT)
    if findings:
        print("Hallazgos del detector ampliado:")
        for hit in findings:
            print(f"  - {hit}")
        sys.exit(1)
    print("Sin hallazgos del detector ampliado.")
    sys.exit(0)