# Runnable Minimal Example (`examples/hypit_minimal/`)

This standalone 5-second example verifies the core `ManimCE[typst] + mpmath + Hypit` pipeline end-to-end:
1. Checks Riemann zeta & Dirichlet eta (`Re(s) > 0`) assertions with `mpmath`.
2. Renders a subtitle-free 5-second `1280×720` (`25 fps`) ManimCE animation using `MathTypst`.
3. Synthesizes a 5-second test audio track (`48 kHz` stereo WAV).
4. Composites the Manim video, outlined bilingual subtitles (`minimal-captions@1` styled via `recipes/course.svs`), and audio into `output.mp4` using pure-local Hypit (`media.local` + `html.local`).

## Prerequisites

- Python environment with `manim[typst]` and `mpmath`
- Node.js (`>= 22.15`) and `npm`
- Local Google Chrome / Chromium and `ffmpeg` / `ffprobe`

## Run From a Clean Directory

### macOS / Linux (Bash / Zsh)

```bash
cd examples/hypit_minimal

# 1. Install Hypit and link the local minimal-captions package
npm install

# 2. Auto-generate ./hypit.runtime.json for your OS (override with HYPIT_CHROME_PATH / HYPIT_FFMPEG_PATH / HYPIT_FFPROBE_PATH if needed)
node init_runtime.mjs

# 3. Generate assets/manim_clip.mp4 and assets/voice.wav
python3 generate_assets.py   # or /path/to/your/manim-venv/bin/python generate_assets.py

# 4. Select the local runtime profile and verify zero cloud requests
npx hypit runtime use ./hypit.runtime.json
npx hypit doctor
npx hypit plan runs/final.svrun

# 5. Render and export output.mp4 locally
npx hypit runtime up --endpoint media.local --endpoint html.local
npx hypit build runs/final.svrun --follow
rm -f output.mp4 && npx hypit get <build-id> --output final.video --to output.mp4
npx hypit runtime down
```

### Windows (PowerShell)

```powershell
Set-Location examples\hypit_minimal

npm install
node init_runtime.mjs
python generate_assets.py    # use the Python environment with manim[typst] and mpmath

npx hypit runtime use .\hypit.runtime.json
npx hypit doctor
npx hypit plan runs\final.svrun

npx hypit runtime up --endpoint media.local --endpoint html.local
npx hypit build runs\final.svrun --follow
Remove-Item -Force -ErrorAction SilentlyContinue output.mp4
npx hypit get <build-id> --output final.video --to output.mp4
npx hypit runtime down
```

*(You can also copy `hypit.runtime.example.json` to `hypit.runtime.json` and fill in the binary paths manually.)*

Expected output: `output.mp4` (`1280×720`, `25 fps`, `5.00s`, H.264 video + AAC stereo audio).
