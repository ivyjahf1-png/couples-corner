#!/usr/bin/env python3
"""
Standalone verification script for the auth + passwordless roll-out.
Reads files directly (no Get-Content \r\n problems), runs tsc, and prints a
clear pass/fail report. Run in background with Start-Process and poll.
"""
from __future__ import annotations
import os, sys, subprocess, time, re, json
from pathlib import Path

WEB = Path(r"C:\Users\HomePC\Documents\couple's conner\web")
sys.path.insert(0, str(WEB))

REPORT = []
def note(msg: str) -> None:
    REPORT.append(msg)

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def file_ok(p: Path, label: str) -> bool:
    if not p.is_file():
        note(f"FAIL  {label}: file missing at {p}")
        return False
    if p.stat().st_size == 0:
        note(f"FAIL  {label}: file is empty ({p})")
        return False
    note(f"PASS  {label}: {p}  ({p.stat().st_size} bytes)")
    return True

def regex_in(p: Path, pattern: str, label: str, expect: bool = True) -> bool:
    text = read_text(p)
    found = bool(re.search(pattern, text, re.MULTILINE))
    status = "PASS" if found == expect else "FAIL"
    detail = "found" if found else "not found"
    note(f"{status}  {label}: {detail}")
    return found == expect

def line_eq(p: Path, lineno: int, expected: str, label: str) -> bool:
    try:
        lines = read_text(p).splitlines()
        actual = lines[lineno - 1].strip() if lineno - 1 < len(lines) else ""
    except Exception as e:
        note(f"FAIL  {label}: cannot read line {lineno} of {p} ({e})")
        return False
    ok = actual == expected
    note(f"{'PASS' if ok else 'FAIL'}  {label}: line {lineno} is {actual!r}")
    return ok

def main() -> None:
    start = time.time()
    note("=" * 70)
    note("Auth + passwordless verification — Couples Corner (web/)")
    note("=" * 70)
    note("")
