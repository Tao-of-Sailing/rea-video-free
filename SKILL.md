---
name: rea-video-free
description: >-
  Local zero-paid-video-API workflow combining rea-video (offline video analysis
  and visual comparison), ManimCE with Typst and mpmath (verified mathematical
  animations), and Hypit (local SVML/SVS multi-track assembly, 2D/3D HTML/WebGL2
  visuals, and outlined subtitles). Use when replicating an authorized local
  reference video or producing original Signals and Systems / math explainer videos
  locally.
---

# Three-Stage Local Video Production (`rea-video-free`)

Coordinate `rea-video`, `Manim Community Edition`, and `Hypit` as sequential stages
in one local pipeline without paid video-generation APIs.

## Role Split

1. **`rea-video` (Analyze & Compare)** — Offline shot detection, sampled palettes,
   `VIDEO.md`, and foreground-mask regression via `rea-video compare` (used in
   Mode A when a reference video is provided).
2. **`ManimCE` + `mpmath` + `Typst` (Math Clips)** — Numerically verified curves,
   transforms, and `MathTypst` formulas rendered **without subtitles** for segments
   that require mathematical precision. Pure motion-graphics or shader segments
   can skip Manim and go straight to Hypit.
3. **`Hypit` (Master Assembly & Render)** — `.svs` design tokens, custom
   `hypit.html-visual@1` 2D Canvas/WebGL2/HTML graphics, `<visual:Clip>` ingestion
   of Manim MP4s, outlined CSS subtitles (`z=100`), local audio normalization, and
   parallel local Chromium rasterization (`html.local` + `media.local`).

---

## Phase 1: Entry & Planning

Choose the branch matching the user's input:

### Mode A: Replicating a Local Reference Video
1. **Rights & Authorization Guardrail (Mandatory):** Before replicating, modifying,
   or preparing a comparison asset for publication, confirm that the reference
   video is owned by the user, in the public domain, or covered by a compatible
   open/explicit license (and prepare required attribution / non-endorsement
   notices). **Never** use watermark blurring or cropping as a workaround for
   missing copyright permission.
2. Inspect the reference video (`ffprobe`) and trim the target range while matching
   the source resolution and frame rate (common HD baseline: `1280x720`, `25 fps`,
   `yuv420p`).
3. Run offline decomposition (never pass `--vlm` unless the user explicitly provides
   and approves a paid VLM key):
   ```bash
   rea-video decompose ref.mp4 -o analysis/
   rea-video summary analysis/breakdown.json
   rea-video videomd analysis/ --check
   ```
4. **Mandatory Visual Check:** Inspect `analysis/storyboard.jpg` and sample
   full-resolution frames before choosing an asset strategy. Offline pixel
   heuristics frequently misclassify paper grain, engraved graphics, 3D scenes, or
   glowing shader waves + lattice crosshairs as `live_action` or text overlays.
5. Extract exact pixel bounding boxes, aspect proportions, color ramps, lattice
   homographies, baseline coordinates, and motion timings from reference frames
   with `PIL`/`numpy` before writing render code.

### Mode B: Creating an Original Explainer (No Reference Clip)
1. Confirm target resolution, frame rate (default example: `1280x720`, `25 fps`),
   target duration, and local narration audio (`.wav`/`.mp3`) if voiceover is used.
2. Draft a shot-by-shot script and frame-aligned timing table (at `25 fps`, use
   integer-frame increments in multiples of `0.04s`, e.g., `3.6s`, `5.0s`, `3.4s`)
   separating:
   - **Math segments** → Phase 2 (`ManimCE` + `mpmath`)
   - **Motion-graphics / title / diagram segments** → Phase 3 (`Hypit` `htmlVisual`)
   - **Bilingual or single-language subtitle cues** → Phase 3 (`Hypit` captions track)
3. Skip `rea-video decompose` and proceed directly to Phase 2 (for math segments)
   or Phase 3 (if no math animation is needed).

---

## Phase 2: Exact Math Animations (`ManimCE` + `Typst`, No Subtitles)

Use Manim for segments requiring mathematical rigor (e.g., analytic continuations,
Fourier epicycles, convolution integrals, sampling/aliasing):

1. Put numerical verification in a standalone `math_core.py` (assertions on zeros,
   Parseval energy, integrals, or FFT invariants) and run it before rendering.
2. **Avoid LaTeX dependencies where missing:**
   - Install `"manim[typst]"` and use `MathTypst(...)` for formulas.
   - Set `Axes(..., axis_config={"include_numbers": False})` and place `Text(...)`
     tick labels manually if axis numbers are desired (`DecimalNumber` invokes
     `latex` by default).
   - Specify a locally available CJK font or cross-platform fallback rather than
     assuming one OS-specific font.
   - Never compare `ManimColor` constants (e.g., `WHITE`) against hex strings
     (`"#FFFFFF"`).
3. **Performance & precision:**
   - Do not render per-frame `always_redraw` subtitles inside Manim — keep Manim
     subtitle-free, drive motion with precomputed points + one lightweight
     `ValueTracker` updater, and add subtitles in Hypit.
   - Render standalone `MathTypst` formulas to cropped transparent PNGs
     (`-s -t --format=png`) when compositing them inside Hypit DOM/Canvas scenes.
4. Normalize Manim clips to exact target durations with `ffmpeg` (`tpad` + `trim`)
   and place all Hypit-referenced assets inside the Hypit project directory (so
   Hypit's workspace-root admission guard accepts them).

---

## Phase 3: Master Engineering & Rich 2D/3D Visuals (`Hypit`, Pure Local)

1. Generate a cross-platform `hypit.runtime.json` with **only** `@hypit/media-local`
   and `@hypit/provider-html-local` (using `examples/hypit_minimal/init_runtime.mjs`
   or OS-appropriate paths for `chromePath`, `ffmpegPath`, and `ffprobePath`; see
   [pitfalls-and-templates.md](./references/pitfalls-and-templates.md)). Verify zero
   cloud requests with:
   ```bash
   npx hypit runtime use ./hypit.runtime.json
   npx hypit doctor
   npx hypit plan runs/final.svrun
   ```
2. Separate concerns across files:
   - `recipes/*.svs`: Design tokens using **dotted paths** (e.g., `film.hd`,
     `course.caption`) and cross-platform CJK/Latin `font-family` fallback stacks.
   - `authors/*.svml`: `time:Clock` + `time:Timeline` (frame-exact window lengths),
     `space:Canvas`, `asset:Audio`/`asset:Video` stored within the project root +
     `mediaop:Normalize`, Manim `<visual:Clip>` segments (`z=10`), custom
     `hypit.html-visual@1` packages (`z=10..20`), and captions (`z=100`).
   - `runs/*.svrun`: Explicit build target (`final.video`).
3. Precision patterns for `htmlVisual`:
   - **Pre-decoded formula PNGs**: Embed cropped `MathTypst` PNGs as DOM
     `<img src="data:image/png;base64,...">` inside `htmlVisual.html` to avoid
     `new Image().onload` async-decode races on frame 0 in headless Chrome.
   - **WebGL2 GLSL shaders**: When replicating continuous wavefields, optical
     lensing, or warped coordinate grids, use `<canvas>` WebGL2 shaders inside
     `htmlVisual` for fast, smooth headless rasterization.
   - **Dual-canvas layering for iris wipes**: Stack `bg-canvas` → DOM `<img>` →
     `iris-canvas` so circular wipes cleanly occlude DOM overlays.
   - **Single-pass offscreen alpha & paper grain**: Pre-render self-overlapping
     translucent ribbons at `alpha = 1.0` on an offscreen canvas; synthesize a
     deterministic `256x256` paper-grain canvas once in `setup()` and composite via
     `multiply`.
   - **Outlined subtitles**: Style subtitles with `-webkit-text-stroke` +
     `paint-order: stroke fill` and `text-shadow` instead of heavy opaque boxes.
4. Build, extract `<build-id>` (`bld_[A-Za-z0-9_]+` including suffix nonce),
   export, and shut down workers cleanly:
   ```bash
   npx hypit runtime up --endpoint media.local --endpoint html.local
   npx hypit build runs/final.svrun --follow
   rm -f output.mp4 && npx hypit get <build-id> --output final.video --to output.mp4
   npx hypit runtime down
   ```

---

## Phase 4: Quantitative & Visual QA Loop

1. When replicating a reference clip, score the output and inspect worst-frame
   strips:
   ```bash
   rea-video compare ref.mp4 output.mp4 --every 0.25 -o compare_out/
   ```
   Remember that `rea-video compare` measures thresholded binary foreground masks:
   continuous 3D gradient/plasma shaders may score lower on `shape` IoU than
   discrete 2D diagrams, so always combine automated scores with visual inspection.
   For original explainers, verify technical specs (`ffprobe`) and extract a
   keyframe storyboard (`scripts/qa_compare_grid.py --mode storyboard`).
2. Visually inspect multi-timestamp grids (`scripts/qa_compare_grid.py --mode grid`
   or `--mode storyboard`) and `compare_out/compare_worst.jpg`. Check for clipped
   formulas/text, badge alignment (`ctx.textAlign` leaks), timing offsets, and
   palette/camera mismatches.
3. Iterate parameters in `.svs`, component `render.js`, or Manim keyframes and
   rebuild until visual QA passes.
4. When a local `ffmpeg` build lacks the `drawtext` filter, render transparent
   label overlays using `Pillow` (see `scripts/qa_compare_grid.py --mode overlay`)
   and composite via `-filter_complex overlay`.

See [pitfalls-and-templates.md](./references/pitfalls-and-templates.md) for
cross-platform runtime initialization, `.svs`/`.svml` starter templates, and
verified pitfall fixes.
