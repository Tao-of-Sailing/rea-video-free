"""Generate verified Manim[typst] math clip and test audio for the minimal Hypit example."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import mpmath as mp
import numpy as np
from manim import *

mp.mp.dps = 25


def verify_math() -> None:
    g1 = mp.im(mp.zetazero(1))
    s1 = mp.mpc("0.5", g1)
    # Verify both zeta(1/2 + i*g1) = 0 and Dirichlet eta analytic continuation on Re(s) > 0
    assert abs(mp.zeta(s1)) < 1e-12
    assert abs(mp.altzeta(s1)) < 1e-12
    assert abs(mp.zeta(2) - mp.pi ** 2 / 6) < 1e-12
    print("Minimal math assertions passed (zero #1 < 1e-12, eta/zeta relation OK, zeta(2) = pi^2/6).")


class MinimalMathScene(Scene):
    def construct(self):
        self.camera.background_color = "#182442"
        plane = NumberPlane(
            x_range=[-3.5, 4.5, 1],
            y_range=[-2.5, 2.5, 1],
            x_length=10.5,
            y_length=6.2,
            background_line_style={"stroke_color": "#384e82", "stroke_width": 1, "stroke_opacity": 0.4},
            axis_config={"stroke_color": "#89a3db", "stroke_width": 1.8, "include_numbers": False},
        )
        self.add(plane)

        ts = np.linspace(0.0, 28.0, 420)
        pts = []
        for t in ts:
            z = mp.zeta(0.5 + 1j * float(t))
            pts.append(plane.c2p(float(mp.re(z)), float(mp.im(z))))

        curve = VMobject(stroke_width=4.5)
        curve.set_points_smoothly(pts)
        curve.set_color_by_gradient("#32b5c8", "#f5bd2e", "#ffa720")

        # Analytic continuation via Dirichlet eta, valid across Re(s) > 0 (including Re(s) = 1/2)
        formula = MathTypst(
            "zeta(s) = 1 / (1 - 2^(1-s)) sum_(n=1)^oo (-1)^(n-1) / n^s , quad Re(s) > 0",
            font_size=28,
            color=WHITE,
        )
        formula.to_corner(UR, buff=0.45)

        self.play(Write(formula), run_time=1.0)
        self.play(Create(curve, rate_func=linear), run_time=3.5)
        self.wait(0.5)


def main() -> None:
    verify_math()
    base = Path(__file__).resolve().parent
    assets_dir = base / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    media_dir = base / "media"

    subprocess.run([
        sys.executable, "-m", "manim",
        "-qm", "--fps", "25",
        "--media_dir", str(media_dir),
        str(Path(__file__).resolve()), "MinimalMathScene",
    ], check=True)

    raw_mp4 = media_dir / "videos" / "generate_assets" / "720p25" / "MinimalMathScene.mp4"
    norm_mp4 = assets_dir / "manim_clip.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-i", str(raw_mp4),
        "-vf", "tpad=stop_mode=clone:stop_duration=1,trim=duration=5.0,setpts=PTS-STARTPTS,fps=25,scale=1280:720",
        "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-an",
        str(norm_mp4),
    ], check=True)

    voice_wav = assets_dir / "voice.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
        "-af", "volume=0.08,afade=t=in:d=0.3,afade=t=out:st=4.5:d=0.5",
        "-acodec", "pcm_s16le", "-ar", "48000", "-ac", "2",
        str(voice_wav),
    ], check=True)
    print(f"Generated assets: {norm_mp4} and {voice_wav}")


if __name__ == "__main__":
    main()
