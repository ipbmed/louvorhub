#!/usr/bin/env python3
"""Extrai hinos do PDF de cifras do Novo Cântico (layout 2 colunas)."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber

PDF_PATH = Path(__file__).parent / "data" / "novo-cantico-cifras.pdf"
OUT_JSON = Path(__file__).parent / "data" / "novo-cantico-cifras.json"
OUT_PREVIEW = Path(__file__).parent / "data" / "novo-cantico-cifras-preview.txt"

# Ex.: "1 DOXOLOGIA. C 4/4" | "400A OFERTÓRIO. G 4/4"
# Título NÃO pode começar com dígito (evita "4 326 HOMENS...").
HEADER_RE = re.compile(
    r"(\d+[A-Za-z]?)\s+"
    r"([A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][^0-9\n]{0,80}?)\.\s*"
    r"([A-G](?:#|b)?(?:m)?)\s+"
    r"(\d{1,2}/\d{1,2})\b"
)

CHORD_TOKEN_RE = re.compile(
    r"^"
    r"[A-G](?:#|b)?"
    r"(?:maj|min|m|M|dim|aug|sus|add)?"
    r"(?:\d+)?"
    r"[+°oO]?"
    r"(?:\([^)]+\))?"
    r"(?:/[A-G](?:#|b)?)?"
    r"$"
)

STUCK_CHORD_RE = re.compile(
    r"([A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus|add)?(?:\d+)?[+°oO]?"
    r"(?:\([^)]+\))?(?:/[A-G](?:#|b)?)?)"
)

# Lixo comum de OCR no livro
JUNK_TOKENS = {"FO", "F0", "|", "||", "l", "I", "—", "-", "–"}


def extract_page_columns(page: pdfplumber.page.Page) -> str:
    w, h = page.width, page.height
    mid = w / 2
    parts: list[str] = []
    for bbox in ((0, 0, mid, h), (mid, 0, w, h)):
        col = page.crop(bbox)
        text = col.extract_text(x_tolerance=2, y_tolerance=3) or ""
        text = text.strip()
        if text:
            parts.append(text)
    return "\n\n".join(parts)


def normalize_chord_token(token: str) -> str | None:
    t = token.strip()
    if t in JUNK_TOKENS:
        return None
    # C#O / FO → tentativa de º
    if t.endswith("O") and len(t) >= 2 and t[:-1] and t[0] in "ABCDEFG":
        cand = t[:-1] + "°"
        if CHORD_TOKEN_RE.match(cand.replace("°", "+")) or True:
            # mantém como dim visual °
            base = t[:-1]
            if CHORD_TOKEN_RE.match(base) or CHORD_TOKEN_RE.match(base + "dim"):
                return base + "°"
    if CHORD_TOKEN_RE.match(t):
        return t.replace("o", "°").replace("O", "°") if t.endswith(("o", "O")) and len(t) > 1 else t
    return None


def split_stuck_chords(token: str) -> list[str]:
    n = normalize_chord_token(token)
    if n:
        return [n]
    parts = STUCK_CHORD_RE.findall(token)
    if parts and "".join(parts) == token:
        out = []
        for p in parts:
            nn = normalize_chord_token(p)
            if nn:
                out.append(nn)
        return out or [token]
    return [token]


def is_chord_line(line: str) -> bool:
    raw = line.strip()
    if not raw or raw.startswith("|"):
        return False
    tokens = raw.split()
    if not tokens:
        return False
    good = 0
    bad = 0
    for t in tokens:
        if t in JUNK_TOKENS:
            continue
        pieces = split_stuck_chords(t)
        ok = all(normalize_chord_token(p) or CHORD_TOKEN_RE.match(p) for p in pieces)
        if ok:
            good += 1
        else:
            bad += 1
    if good == 0:
        return False
    # maioria acordes
    return bad == 0 or (good >= 2 and bad <= 1)


def expand_chord_tokens(line: str) -> list[str]:
    out: list[str] = []
    for t in line.strip().split():
        if t in JUNK_TOKENS:
            continue
        for piece in split_stuck_chords(t):
            n = normalize_chord_token(piece)
            if n:
                out.append(n)
            elif CHORD_TOKEN_RE.match(piece):
                out.append(piece)
    return out


def distribute_chords(lyric: str, chords: list[str]) -> str:
    """Insere [acordes] inline na letra (padrão LouvorHub; a UI desenha acima)."""
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


def pair_chords_and_lyrics(body_lines: list[str]) -> str:
    out: list[str] = []
    i = 0
    pending: list[str] = []

    while i < len(body_lines):
        stripped = body_lines[i].strip()
        if not stripped:
            if pending:
                out.append(" ".join(f"[{c}]" for c in pending))
                pending = []
            out.append("")
            i += 1
            continue

        if is_chord_line(stripped):
            chords = expand_chord_tokens(stripped)
            nxt = body_lines[i + 1].strip() if i + 1 < len(body_lines) else ""
            if nxt and not is_chord_line(nxt):
                out.append(distribute_chords(nxt, pending + chords))
                pending = []
                i += 2
            else:
                pending.extend(chords)
                i += 1
            continue

        if pending:
            out.append(distribute_chords(stripped, pending))
            pending = []
        else:
            out.append(stripped)
        i += 1

    if pending:
        out.append(" ".join(f"[{c}]" for c in pending))

    text = "\n".join(out)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def find_header(line: str) -> re.Match | None:
    """Encontra cabeçalho válido na linha (ignora dígitos soltos à frente)."""
    matches = list(HEADER_RE.finditer(line))
    if not matches:
        return None
    # Prefere o match cujo título não começa com dígito (já garantido) e número "completo"
    # Se houver vários, pega o último que começa perto do início após lixo curto
    for m in matches:
        title = m.group(2).strip()
        if title and not title[0].isdigit():
            # evita títulos absurdamente curtos
            if len(title) >= 2:
                return m
    return matches[-1]


def parse_hymns(full_text: str) -> list[dict]:
    lines = full_text.splitlines()
    hymns: list[dict] = []
    current: dict | None = None
    body: list[str] = []

    def flush():
        nonlocal current, body
        if not current:
            return
        lyrics = pair_chords_and_lyrics(body)
        current["lyrics"] = lyrics
        current["has_brackets"] = bool(re.search(r"\[[A-G]", lyrics))
        current["line_count"] = len([ln for ln in lyrics.splitlines() if ln.strip()])
        hymns.append(current)
        current = None
        body = []

    for line in lines:
        clean = line.replace("## ", "").strip()
        m = find_header(clean)
        if m:
            before = clean[: m.start()].strip()
            # descarta lixo curto tipo "4" antes de "326 HOMENS..."
            if before and current and not re.fullmatch(r"\d+[A-Za-z]?", before):
                body.append(before)
            flush()
            num, title, key, meter = m.groups()
            current = {
                "number": num.upper(),
                "number_int": int(re.match(r"\d+", num).group()),
                "title": re.sub(r"\s+", " ", title).strip(" -–—"),
                "key": key,
                "time_signature": meter,
            }
            after = clean[m.end() :].strip()
            if after:
                body.append(after)
            continue

        if current is not None:
            body.append(line.rstrip())

    flush()
    return hymns


def main() -> int:
    if not PDF_PATH.exists():
        print(f"PDF não encontrado: {PDF_PATH}", file=sys.stderr)
        return 1

    pages_text: list[str] = []
    with pdfplumber.open(PDF_PATH) as pdf:
        print(f"Páginas: {len(pdf.pages)}")
        for i, page in enumerate(pdf.pages):
            pages_text.append(extract_page_columns(page))
            if (i + 1) % 20 == 0:
                print(f"  extraindo… {i + 1}/{len(pdf.pages)}")

    hymns = parse_hymns("\n\n".join(pages_text))

    by_num: dict[str, dict] = {}
    for h in hymns:
        prev = by_num.get(h["number"])
        if not prev or h["line_count"] > prev["line_count"]:
            by_num[h["number"]] = h

    ordered = sorted(by_num.values(), key=lambda h: (h["number_int"], h["number"]))

    OUT_JSON.write_text(json.dumps(ordered, ensure_ascii=False, indent=2), encoding="utf-8")

    preview = []
    for h in ordered[:5] + [next(x for x in ordered if x["number"] == "326")]:
        preview.append(f"=== {h['number']} {h['title']} | {h['key']} {h['time_signature']} ===")
        preview.append(h["lyrics"][:700])
        preview.append("")
    OUT_PREVIEW.write_text("\n".join(preview), encoding="utf-8")

    with_chords = sum(1 for h in ordered if h["has_brackets"])
    print(f"Hinos extraídos: {len(ordered)} (com cifras: {with_chords})")
    print(f"JSON: {OUT_JSON}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
