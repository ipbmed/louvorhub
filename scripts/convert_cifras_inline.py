#!/usr/bin/env python3
"""Converte cifras em linha própria → formato inline [C]letra[G]... no JSON extraído."""

from __future__ import annotations

import json
import re
from pathlib import Path

JSON_PATH = Path(__file__).parent / "data" / "novo-cantico-cifras.json"

CHORD_ONLY_RE = re.compile(r"^(?:\[[^\]]+\]\s*)+$")
CHORD_TOKEN_RE = re.compile(r"\[([^\]]+)\]")


def distribute_chords(lyric: str, chords: list[str]) -> str:
    lyric = lyric.strip()
    if not chords:
        return lyric
    if not lyric:
        return " ".join(f"[{c}]" for c in chords)
    if len(chords) == 1:
        return f"[{chords[0]}]{lyric}"

    n = len(chords)
    L = len(lyric)
    positions = [0]
    for i in range(1, n):
        positions.append(min(L, int(round(i * L / n))))
    for i in range(1, n):
        if positions[i] <= positions[i - 1]:
            positions[i] = min(L, positions[i - 1] + 1)

    parts: list[str] = []
    last = 0
    for chord, pos in zip(chords, positions):
        parts.append(lyric[last:pos])
        parts.append(f"[{chord}]")
        last = pos
    parts.append(lyric[last:])
    return "".join(parts)


def convert_lyrics(text: str) -> str:
    lines = text.splitlines()
    out: list[str] = []
    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
        if (
            stripped
            and CHORD_ONLY_RE.match(stripped)
            and nxt
            and not CHORD_ONLY_RE.match(nxt)
        ):
            chords = CHORD_TOKEN_RE.findall(stripped)
            out.append(distribute_chords(nxt, chords))
            i += 2
            continue
        out.append(lines[i])
        i += 1
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def main() -> None:
    hymns = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    converted = 0
    for h in hymns:
        before = h.get("lyrics") or ""
        after = convert_lyrics(before)
        if after != before:
            h["lyrics"] = after
            converted += 1
    JSON_PATH.write_text(json.dumps(hymns, ensure_ascii=False, indent=2), encoding="utf-8")
    sample = next(x for x in hymns if x["number"] == "1")
    print(f"Convertidos: {converted}/{len(hymns)}")
    print("--- hino 1 ---")
    print(sample["lyrics"][:400])


if __name__ == "__main__":
    main()
