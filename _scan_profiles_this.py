#!/usr/bin/env python3
import sys, re
p = r"C:\Users\HomePC\Documents\couple's conner\web\lib\server\profiles.ts"
lines = open(p, encoding="utf-8").read().splitlines()
for i,l in enumerate(lines,1):
    if "profiles" in l.lower() or ".select" in l or ".update" in l or ".insert" in l or ".from" in l or "from(" in l or "KNOWN_PROFILE" in l:
        print(f"{i}: {l}")
