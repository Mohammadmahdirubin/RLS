#!/usr/bin/env python3
"""Create and cache one permanent PNG membership certificate per approved public member."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont
from arabic_reshaper import reshape
from bidi.algorithm import get_display
from pyzbar.pyzbar import decode as decode_qr

ROOT = Path(__file__).resolve().parents[1]
CONFIG_FILE = ROOT / "assets" / "supabase-config.js"
TEMPLATE_FILE = ROOT / "Bilingual Russian Language Membership Certificate.png"
OUTPUT_DIR = ROOT / "assets" / "certificates"
MANIFEST_FILE = OUTPUT_DIR / "manifest.json"
DESIGN_VERSION = "rls-certificate-static-v1"
PROFILE_BASE = "https://rlsj.ir/community.html?member="
GROUPS = {
    "student": "دانشجو",
    "graduate": "دانش‌آموخته",
    "faculty": "استاد و عضو هیئت علمی",
    "researcher": "پژوهشگر",
    "translator": "مترجم",
    "culture": "ادبیات و فرهنگ",
    "honorary": "عضو افتخاری",
}

def read_config() -> tuple[str, str]:
    text = CONFIG_FILE.read_text(encoding="utf-8")
    url = re.search(r'url\s*:\s*["\']([^"\']+)["\']', text)
    key = re.search(r'(?:publishableKey|anonKey)\s*:\s*["\']([^"\']+)["\']', text)
    if not url or not key:
        raise RuntimeError("Could not read the public Supabase configuration.")
    return url.group(1).rstrip("/") + "/", key.group(1)

def fetch_members() -> list[dict]:
    base, key = read_config()
    endpoint = urljoin(base, "rest/v1/rls_public_members")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    params = {
        "select": "user_id,display_name,category,created_at,member_number,membership_status",
        "membership_status": "eq.approved",
        "member_number": "not.is.null",
        "order": "member_number.asc",
    }
    members: list[dict] = []
    start = 0
    while True:
        page_headers = {**headers, "Range": f"{start}-{start + 499}"}
        response = requests.get(endpoint, headers=page_headers, params=params, timeout=25)
        response.raise_for_status()
        batch = response.json()
        if not isinstance(batch, list):
            raise RuntimeError("Supabase returned an unexpected member-list response.")
        members.extend(batch)
        if len(batch) < 500:
            break
        start += 500
    return members

def find_font(bold: bool) -> str:
    candidates = (
        [
            "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        if bold else [
            "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    )
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    raise RuntimeError("No Arabic/Persian-capable font is installed on the runner.")

def visual_rtl(value: str) -> str:
    return get_display(reshape(str(value or "")))

def persian_digits(value: str) -> str:
    return str(value).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))

def member_date(value: str) -> str:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return persian_digits(parsed.astimezone(timezone.utc).astimezone().strftime("%Y-%m-%d")) if False else persian_digits(
        __import__("jdatetime").date.fromgregorian(date=parsed.date()).strftime("%Y/%m/%d")
    )

def source_fingerprint(member: dict) -> str:
    relevant = {
        "design": DESIGN_VERSION,
        "user_id": str(member["user_id"]),
        "display_name": str(member.get("display_name") or ""),
        "category": str(member.get("category") or ""),
        "created_at": str(member.get("created_at") or ""),
        "member_number": str(member.get("member_number") or ""),
    }
    payload = json.dumps(relevant, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def build_certificate(member: dict, output: Path) -> str:
    user_id = str(member.get("user_id") or "")
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", user_id):
        raise ValueError(f"Invalid member user_id: {user_id!r}")
    number = int(member.get("member_number") or 0)
    if number < 1:
        raise ValueError(f"Invalid membership number for {user_id}")
    if member.get("membership_status") != "approved":
        raise ValueError(f"Member {user_id} is not approved.")

    with Image.open(TEMPLATE_FILE) as source:
        certificate = source.convert("RGB")
    draw = ImageDraw.Draw(certificate)
    scale = certificate.width / 1500.0

    name = str(member.get("display_name") or "").strip()
    if not name:
        raise ValueError(f"Missing public display_name for {user_id}")

    name_font = ImageFont.truetype(find_font(True), max(1, round(46 * scale)))
    detail_font = ImageFont.truetype(find_font(True), max(1, round(29 * scale)))
    navy = (16, 47, 91)

    draw.text(
        (round(746 * scale), round(535 * scale)),
        visual_rtl(name),
        font=name_font,
        fill=navy,
        anchor="mm",
        stroke_width=0,
    )

    category = GROUPS.get(str(member.get("category") or ""), str(member.get("category") or "—"))
    created_at = str(member.get("created_at") or "")
    date_label = member_date(created_at)
    fields = [
        (persian_digits(f"{number:06d}"), 770),
        (category, 826),
        (date_label, 882),
    ]
    for value, y in fields:
        draw.text(
            (round(350 * scale), round(y * scale)),
            visual_rtl(value),
            font=detail_font,
            fill=navy,
            anchor="rm",
            stroke_width=0,
        )

    target_url = PROFILE_BASE + user_id
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    qr_box = round(156 * scale)
    qr_size = round(150 * scale)
    qr_x = round(1265 * scale)
    qr_y = round(735 * scale)
    inset = round(3 * scale)
    qr_image = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)

    draw.rectangle(
        (qr_x, qr_y, qr_x + qr_box - 1, qr_y + qr_box - 1),
        fill=(255, 255, 255),
    )
    certificate.paste(qr_image, (qr_x + inset, qr_y + inset))

    output.parent.mkdir(parents=True, exist_ok=True)
    certificate.save(output, format="PNG", optimize=True, compress_level=9)

    # Decode the QR from the final composite, not merely from the source QR image.
    with Image.open(output) as saved:
        qr_crop = saved.crop((qr_x, qr_y, qr_x + qr_box, qr_y + qr_box))
        decoded = decode_qr(qr_crop)
    destinations = [item.data.decode("utf-8", errors="replace") for item in decoded]
    if target_url not in destinations:
        raise RuntimeError(
            f"QR verification failed for {user_id}; expected {target_url}, got {destinations}"
        )
    return target_url

def main() -> None:
    if not TEMPLATE_FILE.exists():
        raise FileNotFoundError(f"Certificate template not found: {TEMPLATE_FILE}")
    members = fetch_members()
    print(f"Found {len(members)} approved public members with a membership number.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    old_manifest = {"schema": 1, "certificates": {}}
    if MANIFEST_FILE.exists():
        try:
            old_manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print("Existing certificate manifest is invalid; rebuilding it.")
    old_entries = old_manifest.get("certificates", {})
    new_entries = dict(old_entries)
    generated = 0
    skipped = 0

    for member in members:
        user_id = str(member.get("user_id") or "")
        if not user_id:
            continue
        fingerprint = source_fingerprint(member)
        filename = f"member-{user_id}.png"
        output = OUTPUT_DIR / filename
        previous = old_entries.get(user_id, {})
        if previous.get("fingerprint") == fingerprint and output.exists() and output.stat().st_size > 0:
            skipped += 1
            continue

        target_url = build_certificate(member, output)
        new_entries[user_id] = {
            "file": f"assets/certificates/{filename}",
            "fingerprint": fingerprint,
            "membership_number": int(member["member_number"]),
            "qr_url": target_url,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        generated += 1
        print(
            f"Generated and QR-verified member {int(member['member_number']):06d}: "
            f"{filename} ({output.stat().st_size} bytes)"
        )

    manifest = {
        "schema": 1,
        "design": DESIGN_VERSION,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "certificates": dict(sorted(new_entries.items())),
    }
    serialized = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    if not MANIFEST_FILE.exists() or MANIFEST_FILE.read_text(encoding="utf-8") != serialized:
        MANIFEST_FILE.write_text(serialized, encoding="utf-8")
    print(f"Done: {generated} generated, {skipped} unchanged. Certificate files are reusable until source data changes.")

if __name__ == "__main__":
    main()
