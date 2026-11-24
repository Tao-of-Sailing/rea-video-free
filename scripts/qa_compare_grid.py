"""Build multi-timestamp visual QA grids, storyboards, and Pillow overlays."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
FPS = 25
FONT_CANDIDATES = [
    # macOS
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    # Linux
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansSC-Regular.otf",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    # Windows
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/arial.ttf",
]

_WARNED_DEFAULT_FONT = False


def load_font(size: int) -> ImageFont.ImageFont:
    global _WARNED_DEFAULT_FONT
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    if not _WARNED_DEFAULT_FONT:
        print(
            "Warning: no TrueType CJK/Latin font found in FONT_CANDIDATES; "
            "falling back to Pillow bitmap default.",
            file=sys.stderr,
        )
        _WARNED_DEFAULT_FONT = True
    return ImageFont.load_default()


def load_frames(mp4_path: Path, duration: float = 12.0) -> np.ndarray:
    cmd = [
        "ffmpeg", "-v", "error", "-i", str(mp4_path),
        "-t", f"{duration:.3f}", "-vf", f"fps={FPS},scale={W}:{H}",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    raw = subprocess.check_output(cmd)
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W, 3)


def make_compare_grid(
    ref_mp4: Path,
    remake_mp4: Path,
    out_jpg: Path,
    timestamps: list[float],
    v1_mp4: Path | None = None,
    duration: float = 12.0,
) -> None:
    ref = load_frames(ref_mp4, duration=duration)
    fin = load_frames(remake_mp4, duration=duration)
    v1 = load_frames(v1_mp4, duration=duration) if v1_mp4 else None

    rows_per_block = 3 if v1 is not None else 2
    cols = 4 if len(timestamps) >= 8 else len(timestamps)
    tw, th = 384, 216
    hdr_h = 30
    row_lbl_w = 155
    blocks = (len(timestamps) + cols - 1) // cols

    canvas = Image.new("RGB", (row_lbl_w + cols * tw, blocks * (hdr_h + th * rows_per_block)), (16, 20, 32))
    draw = ImageDraw.Draw(canvas)
    font = load_font(16)

    for b in range(blocks):
        y0 = b * (hdr_h + th * rows_per_block)
        draw.text((12, y0 + hdr_h + th // 2 - 10), "Reference", font=font, fill=(235, 240, 250))
        if v1 is not None:
            draw.text((12, y0 + hdr_h + th + th // 2 - 10), "V1 Output", font=font, fill=(255, 195, 110))
            draw.text((12, y0 + hdr_h + th * 2 + th // 2 - 10), "Final Output", font=font, fill=(130, 245, 185))
        else:
            draw.text((12, y0 + hdr_h + th + th // 2 - 10), "Recreation", font=font, fill=(130, 245, 185))

        for c in range(cols):
            idx = b * cols + c
            if idx >= len(timestamps):
                break
            t = timestamps[idx]
            fi = min(len(ref) - 1, len(fin) - 1, int(round(t * FPS)))
            x0 = row_lbl_w + c * tw
            draw.text((x0 + 8, y0 + 6), f"t={t:.2f}s", font=font, fill=(255, 220, 110))

            canvas.paste(Image.fromarray(ref[fi]).resize((tw, th), Image.LANCZOS), (x0, y0 + hdr_h))
            if v1 is not None:
                v1_i = min(len(v1) - 1, fi)
                canvas.paste(Image.fromarray(v1[v1_i]).resize((tw, th), Image.LANCZOS), (x0, y0 + hdr_h + th))
                canvas.paste(Image.fromarray(fin[fi]).resize((tw, th), Image.LANCZOS), (x0, y0 + hdr_h + th * 2))
            else:
                canvas.paste(Image.fromarray(fin[fi]).resize((tw, th), Image.LANCZOS), (x0, y0 + hdr_h + th))

    out_jpg.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_jpg, quality=92)
    print(f"Saved QA grid: {out_jpg}")


def make_storyboard(
    video_mp4: Path,
    out_jpg: Path,
    timestamps: list[float],
    duration: float = 12.0,
    cols: int = 4,
) -> None:
    frames = load_frames(video_mp4, duration=duration)
    tw, th = 420, 236
    hdr_h = 30
    pad = 14
    rows = (len(timestamps) + cols - 1) // cols
    canvas = Image.new("RGB", (pad + cols * (tw + pad), pad + rows * (th + hdr_h + pad)), (24, 32, 48))
    draw = ImageDraw.Draw(canvas)
    font = load_font(16)

    for idx, t in enumerate(timestamps):
        r, c = idx // cols, idx % cols
        x = pad + c * (tw + pad)
        y = pad + r * (th + hdr_h + pad)
        fi = min(len(frames) - 1, max(0, int(round(t * FPS))))
        draw.text((x + 4, y + 5), f"t={t:.2f}s", font=font, fill=(245, 210, 130))
        canvas.paste(Image.fromarray(frames[fi]).resize((tw, th), Image.LANCZOS), (x, y + hdr_h))

    out_jpg.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_jpg, quality=92)
    print(f"Saved storyboard: {out_jpg}")


def make_side_by_side_overlay(out_png: Path, left_label: str, right_label: str) -> None:
    img = Image.new("RGBA", (2560, 720), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = load_font(24)
    draw.rounded_rectangle([18, 14, 480, 56], radius=10, fill=(12, 16, 28, 195))
    draw.text((34, 21), left_label, font=font, fill=(255, 255, 255, 255))
    draw.rounded_rectangle([1298, 14, 1820, 56], radius=10, fill=(12, 16, 28, 195))
    draw.text((1314, 21), right_label, font=font, fill=(130, 245, 195, 255))
    draw.rectangle([1278, 0, 1282, 720], fill=(245, 200, 90, 220))
    out_png.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_png)
    print(f"Saved side-by-side overlay PNG: {out_png}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate QA grids, storyboards, and Pillow overlays for rea-video-free.")
    ap.add_argument("--mode", choices=["grid", "storyboard", "overlay"], required=True)
    ap.add_argument("--ref", type=Path)
    ap.add_argument("--final", type=Path)
    ap.add_argument("--v1", type=Path, default=None)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--timestamps", nargs="+", type=float, default=[0.0, 2.0, 4.0, 6.0, 8.0, 10.0, 10.5, 11.5])
    ap.add_argument("--duration", type=float, default=12.0)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--left-label", default="Reference (Public Domain)")
    ap.add_argument("--right-label", default="Local Recreation (rea-video-free)")
    args = ap.parse_args()

    if args.mode == "grid":
        if not args.ref or not args.final:
            ap.error("--ref and --final are required for --mode grid")
        make_compare_grid(
            args.ref, args.final, args.out, args.timestamps,
            v1_mp4=args.v1, duration=args.duration,
        )
    elif args.mode == "storyboard":
        src = args.final or args.ref
        if not src:
            ap.error("--final (or --ref) is required for --mode storyboard")
        make_storyboard(src, args.out, args.timestamps, duration=args.duration, cols=args.cols)
    else:
        make_side_by_side_overlay(args.out, args.left_label, args.right_label)


if __name__ == "__main__":
    main()
