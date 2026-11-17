#!/usr/bin/env python3
"""Create and cache one permanent PNG membership certificate per approved public member."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from urllib.parse import urljoin

import requests
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont, features
from pyzbar.pyzbar import decode as decode_qr

ROOT = Path(__file__).resolve().parents[1]
CONFIG_FILE = ROOT / "assets" / "supabase-config.js"
TEMPLATE_FILE = ROOT / "Bilingual Russian Language Membership Certificate.png"
OUTPUT_DIR = ROOT / "assets" / "certificates"
MANIFEST_FILE = OUTPUT_DIR / "manifest.json"
DESIGN_VERSION = "rls-certificate-persian-raqm-tehran-date-v7-noto-arabic-digits"
PREVIEW_VERSION = "rls-preview-persian-raqm-v3"
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
        "select": "user_id,full_name,category,created_at,reviewed_at,member_number,membership_status",
        "membership_status": "eq.approved",
        "member_number": "not.is.null",
        "order": "member_number.asc",
    }
    members: list[dict] = []
    start = 0
    while True:
        page_headers = {**headers, "Range": f"{start}-{start + 499}"}
        response = requests.get(endpoint, headers=page_headers, params=params, timeout=25)
        if not response.ok:
            raise RuntimeError(f"Supabase member query failed (HTTP {response.status_code}): {response.text[:800]}")
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

def load_text_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a font with HarfBuzz/FriBidi shaping so Pillow handles Persian exactly once."""
    if not features.check_feature("raqm"):
        raise RuntimeError("Pillow lacks libraqm/RAQM; Persian text cannot be rendered safely.")
    return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)


def draw_persian_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str,
                      font: ImageFont.FreeTypeFont, *, anchor: str,
                      direction: str = "rtl") -> None:
    """Draw logical Unicode text; RAQM performs shaping and bidi once, without pre-reversal."""
    draw.text(
        xy, str(value or ""), font=font, fill=(16, 47, 91), anchor=anchor,
        direction=direction, language="fa" if direction == "rtl" else None,
        stroke_width=0,
    )

def persian_digits(value: str) -> str:
    return str(value).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))

def member_date(value: str) -> str:
    """Convert the membership timestamp to the official Tehran calendar date."""
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    local_date = parsed.astimezone(ZoneInfo("Asia/Tehran")).date()
    jalali_date = __import__("jdatetime").date.fromgregorian(date=local_date)
    return persian_digits(jalali_date.strftime("%Y/%m/%d"))

def source_fingerprint(member: dict) -> str:
    relevant = {
        "design": DESIGN_VERSION,
        "user_id": str(member["user_id"]),
        "full_name": str(member.get("full_name") or ""),
        "category": str(member.get("category") or ""),
        "created_at": str(member.get("created_at") or ""),
        "reviewed_at": str(member.get("reviewed_at") or ""),
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

    name = str(member.get("full_name") or "").strip()
    if not name:
        raise ValueError(f"Missing full_name for {user_id}")

    name_font = load_text_font(find_font(True), max(1, round(46 * scale)))
    detail_font = load_text_font(find_font(True), max(1, round(29 * scale)))
    # Use a font with Persian Extended-Arabic digits; Noto Naskh may render U+06F0–U+06F9 as empty squares.
    digit_font = load_text_font("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf", max(1, round(29 * scale)))

    # Keep the original Unicode order. RAQM applies Persian glyph shaping and bidi once.
    draw_persian_text(
        draw, (round(746 * scale), round(535 * scale)), name,
        name_font, anchor="mm", direction="rtl",
    )

    category = GROUPS.get(str(member.get("category") or ""), str(member.get("category") or "—"))
    created_at = str(member.get("created_at") or "")
    date_label = member_date(str(member.get("reviewed_at") or created_at))
    fields = [
        (persian_digits(f"{number:06d}"), 770, "ltr"),
        (category, 826, "rtl"),
        (date_label, 882, "ltr"),
    ]
    for value, y, direction in fields:
        draw_persian_text(
            draw, (round(350 * scale), round(y * scale)), value,
            digit_font if direction == "ltr" else detail_font,
            anchor="rm", direction=direction,
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

def cached_certificate_is_valid(member: dict, output: Path) -> bool:
    """Check cached PNG integrity and decode the QR from the final composed certificate."""
    try:
        user_id = str(member.get("user_id") or "")
        if not re.fullmatch(r"[0-9a-fA-F-]{36}", user_id):
            return False
        target_url = PROFILE_BASE + user_id
        with Image.open(TEMPLATE_FILE) as template:
            expected_size = template.size
        with Image.open(output) as saved:
            if saved.format != "PNG" or saved.size != expected_size:
                return False
            saved.load()
            scale = saved.width / 1500.0
            qr_box = round(156 * scale)
            qr_x = round(1265 * scale)
            qr_y = round(735 * scale)
            qr_crop = saved.crop((qr_x, qr_y, qr_x + qr_box, qr_y + qr_box))
            decoded = decode_qr(qr_crop)
        destinations = [item.data.decode("utf-8", errors="replace") for item in decoded]
        return target_url in destinations
    except Exception as error:
        print(f"Cached certificate validation failed for {output.name}: {error}")
        return False


def qr_is_decodable(image_path: Path) -> bool:
    try:
        with Image.open(image_path) as image:
            image.load()
            return bool(decode_qr(image.convert("RGB")))
    except Exception as error:
        print(f"QR check failed for {image_path.name}: {error}")
        return False

def build_webp_variants(png_path: Path) -> tuple[Path, Path]:
    """Create a compact admin preview and a high-quality downloadable WebP."""
    full_path = png_path.with_suffix(".webp")
    preview_path = png_path.with_name(png_path.stem + ".preview.webp")
    with Image.open(png_path) as source:
        full = source.convert("RGB")
        full.save(full_path, "WEBP", quality=92, method=6)
        # Retain lossless encoding if lossy compression damages QR readability.
        if not qr_is_decodable(full_path):
            full.save(full_path, "WEBP", lossless=True, method=6)

        preview = source.convert("RGB")
        # Prefer a small preview, increasing dimensions only when QR validation needs it.
        preview.thumbnail((1100, 1100), Image.Resampling.LANCZOS)
        preview.save(preview_path, "WEBP", quality=88, method=5)
        if not qr_is_decodable(preview_path):
            with Image.open(png_path) as original:
                preview = original.convert("RGB")
                preview.thumbnail((1300, 1300), Image.Resampling.LANCZOS)
                preview.save(preview_path, "WEBP", quality=90, method=5)
        if not qr_is_decodable(preview_path):
            with Image.open(png_path) as original:
                preview = original.convert("RGB")
                preview.thumbnail((1500, 1500), Image.Resampling.LANCZOS)
                preview.save(preview_path, "WEBP", quality=92, method=5)
        if not qr_is_decodable(preview_path):
            preview.save(preview_path, "WEBP", quality=96, method=5)
        if not qr_is_decodable(preview_path):
            preview.save(preview_path, "WEBP", lossless=True, method=5)
        if not qr_is_decodable(preview_path):
            raise RuntimeError(f"QR verification failed for preview {preview_path.name}")
    if not qr_is_decodable(full_path):
        raise RuntimeError(f"QR verification failed for full WebP {full_path.name}")
    print(
        f"Optimized {png_path.name}: preview={preview_path.stat().st_size:,} bytes; "
        f"download={full_path.stat().st_size:,} bytes"
    )
    return full_path, preview_path

def main() -> None:
    if not features.check_feature("raqm"):
        raise RuntimeError("Pillow lacks libraqm/RAQM; refusing to publish malformed Persian certificates.")
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
        unchanged = (
            previous.get("fingerprint") == fingerprint
            and output.exists()
            and output.stat().st_size > 0
            and cached_certificate_is_valid(member, output)
        )
        if unchanged:
            skipped += 1
            target_url = PROFILE_BASE + user_id
        else:
            target_url = build_certificate(member, output)
            generated += 1
            print(
                f"Generated and QR-verified member {int(member['member_number']):06d}: "
                f"{filename} ({output.stat().st_size} bytes)"
            )

        full_webp = output.with_suffix(".webp")
        preview_webp = output.with_name(output.stem + ".preview.webp")
        if (
            not unchanged
            or not full_webp.exists()
            or full_webp.stat().st_size == 0
            or not preview_webp.exists()
            or preview_webp.stat().st_size == 0
            or not qr_is_decodable(full_webp)
            or not qr_is_decodable(preview_webp)
            or previous.get("preview_version") != PREVIEW_VERSION
        ):
            full_webp, preview_webp = build_webp_variants(output)
        new_entries[user_id] = {
            "file": f"assets/certificates/{filename}",
            "full_file": f"assets/certificates/{full_webp.name}",
            "preview_file": f"assets/certificates/{preview_webp.name}",
            "preview_version": PREVIEW_VERSION,
            "fingerprint": fingerprint,
            "membership_number": int(member["member_number"]),
            "qr_url": target_url,
            "generated_at": (
                previous.get("generated_at")
                if unchanged and previous.get("generated_at")
                else datetime.now(timezone.utc).isoformat()
            ),
        }

    sorted_entries = dict(sorted(new_entries.items()))
    previous_design = old_manifest.get("design")
    previous_entries = old_manifest.get("certificates", {})
    content_changed = (
        previous_design != DESIGN_VERSION
        or previous_entries != sorted_entries
        or not MANIFEST_FILE.exists()
    )

    manifest = {
        "schema": 1,
        "design": DESIGN_VERSION,
        "updated_at": (
            datetime.now(timezone.utc).isoformat()
            if content_changed
            else old_manifest.get("updated_at")
        ),
        "certificates": sorted_entries,
    }
    serialized = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    if content_changed or MANIFEST_FILE.read_text(encoding="utf-8") != serialized:
        MANIFEST_FILE.write_text(serialized, encoding="utf-8")
    print(f"Done: {generated} generated, {skipped} unchanged. Certificate files are reusable until source data changes.")

if __name__ == "__main__":
    main()
