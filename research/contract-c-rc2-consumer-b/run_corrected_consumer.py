#!/usr/bin/env python3
"""Narrow correction for the first failed consumer run.

The first run assumed relevant Contract-B YAML scalar keys were column-zero. This
wrapper changes only generic YAML indentation handling, then executes the already
frozen experiment/control logic unchanged. The failed run remains in Actions history.
"""
from __future__ import annotations

import json
import re
import runpy
import sys

import consumer


def indentation_aware_yaml_scalar(text: str, key: str) -> str | None:
    lines = text.splitlines()
    pat = re.compile(rf"^(\s*){re.escape(key)}:\s*(.*)$")
    for i, line in enumerate(lines):
        m = pat.match(line)
        if not m:
            continue
        base_indent = len(m.group(1).expandtabs(8))
        first = m.group(2)
        parts = [first] if first else []
        j = i + 1
        while j < len(lines):
            nxt = lines[j]
            if not nxt.strip():
                j += 1
                continue
            indent = len(nxt) - len(nxt.lstrip(" \t"))
            if indent <= base_indent:
                break
            parts.append(nxt.strip())
            j += 1
        value = " ".join(parts).strip()
        if len(value) >= 2 and value[0] == value[-1] == "'":
            value = value[1:-1].replace("''", "'")
        elif len(value) >= 2 and value[0] == value[-1] == '"':
            value = json.loads(value)
        return value
    return None


consumer._yaml_scalar = indentation_aware_yaml_scalar
runpy.run_path(str(__file__).replace("run_corrected_consumer.py", "run_experiment.py"), run_name="__main__")
