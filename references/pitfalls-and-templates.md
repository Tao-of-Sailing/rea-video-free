# Cross-Platform Templates & Pitfalls Reference

## 1. Pure-Local `hypit.runtime.json` (Cross-Platform)

Do **not** commit machine-specific binary paths into Git. Use [../examples/hypit_minimal/init_runtime.mjs](../examples/hypit_minimal/init_runtime.mjs) to auto-detect local binaries on **macOS, Linux, or Windows**, or start from [../examples/hypit_minimal/hypit.runtime.example.json](../examples/hypit_minimal/hypit.runtime.example.json):

```bash
node init_runtime.mjs
# Optional explicit overrides:
# HYPIT_CHROME_PATH=... HYPIT_FFMPEG_PATH=... HYPIT_FFPROBE_PATH=... node init_runtime.mjs
```

Common binary path conventions when configuring manually:

| OS | Chrome / Chromium | FFmpeg / ffprobe |
|---|---|---|
| **macOS** | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | `/opt/homebrew/bin/ffmpeg` or `/usr/local/bin/ffmpeg` |
| **Linux** | `/usr/bin/google-chrome` or `/usr/bin/chromium` | `/usr/bin/ffmpeg` |
| **Windows** | `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe` | `ffmpeg.exe` on `PATH` (e.g., via `winget install Gyan.FFmpeg`) |

*(Note: End-to-end rendering has been verified on Apple Silicon macOS `26.6` with Google Chrome and Homebrew `ffmpeg 9.0.2`. Linux and Windows setups use standard cross-platform path detection and remain unverified on target hardware.)*

---

## 2. Minimal Runnable `.svs`, `.svml`, and `.svrun` (Manim + Audio + Outlined Subtitles)

This matches the verified runnable project in [../examples/hypit_minimal/](../examples/hypit_minimal/README.md).

`recipes/course.svs` (dotted rule names are required by `@hypit/recipe@1`, with cross-platform CJK/Latin font stacks):
```css
<?svml using="@hypit/recipe@1"?>
<sheet version="1">
  film.hd { background: #182442; }
  course.caption {
    zh-color: #ffffff;
    en-color: #f6f7fb;
    zh-size: 30px;
    en-size: 24px;
    bottom-offset: 56px;
    font-zh: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif;
    font-en: "Avenir Next", "Segoe UI", "Inter", "Helvetica Neue", "Noto Sans", Arial, sans-serif;
  }
</sheet>
```

`authors/lesson.svml` (combining normalized Manim MP4 + `minimal-captions@1` subtitles + audio):
```xml
<?svml using="@hypit/markup@1"?>
<svml>
  <import as="time" from="@hypit/timeline-author@1"/>
  <import as="space" from="@hypit/spatial@1"/>
  <import as="asset" from="@hypit/media@1"/>
  <import as="mediaop" from="@hypit/media-operations@1"/>
  <import as="visual" from="@hypit/visual-track@1"/>
  <import as="audio" from="@hypit/audio-track@1"/>
  <import as="cap" from="minimal-captions@1"/>
  <import as="film" from="@hypit/film@1"/>
  <import as="html" from="@hypit/html-video@1"/>
  <import as="recipes" source="../recipes/course.svs"/>

  <time:Clock id="clock" frame-rate="25"/>
  <time:Timeline id="program" clock={clock} end="5s">
    <time:Window id="math-win" from="start" for="5s"/>
  </time:Timeline>

  <space:Canvas id="hd" width="1280" height="720"/>
  <space:Frame id="full-frame" within={hd.bounds} left="0%" top="0%" right="100%" bottom="100%"/>

  <asset:Video id="manim-raw" src="../assets/manim_clip.mp4"/>
  <mediaop:Normalize id="manim-norm" source={manim-raw}
    video="primary-moving" audio="none" span-authority="video" clock={clock}/>

  <asset:Audio id="voice-raw" src="../assets/voice.wav"/>
  <mediaop:Normalize id="voice-norm" source={voice-raw}
    video="none" audio="default" span-authority="audio" clock={clock}/>

  <visual:Track id="math" timeline={program.timeline}>
    <visual:Clip id="math-clip" media={manim-norm.media}
      during={program.math-win} frame={full-frame} z="10" fit="cover"/>
  </visual:Track>

  <cap:Captions id="captions" timeline={program.timeline} within={hd.bounds}
    style={recipes.course.caption} stack-order="100"/>

  <audio:Track id="mix" timeline={program.timeline}>
    <audio:Clip id="voice" source={voice-norm.media} during={program.math-win}/>
  </audio:Track>

  <film:Film id="main" canvas={hd.canvas} timeline={program.timeline} appearance={recipes.film.hd}>
    <film:Track source={math.visual}/>
    <film:Track source={captions.visual}/>
    <film:Track source={mix.audio}/>
  </film:Film>

  <html:Video id="final" composition={main.composition} timeline={program.timeline}/>
</svml>
```

---

## 3. Verified Pitfall Guards

| Tool | Observed Failure | Verified Fix |
|---|---|---|
| `ffmpeg` (e.g., Homebrew 9.x) | `No such filter: 'drawtext'` | Render transparent PNG overlays via `Pillow` and composite via `-filter_complex overlay`. |
| `ManimCE` (`Axes`) | `FileNotFoundError: 'latex'` | Pass `axis_config={"include_numbers": False}` and add `Text(...)` labels manually; use `MathTypst` for formulas. |
| `ManimCE` (`ManimColor`) | `TypeError: Cannot compare ManimColor with str` | Compare hex strings (`"#FFFFFF"`), not `WHITE`, when mixing with hex palette arrays. |
| `ManimCE` (`always_redraw`) | Slow renders when updating complex groups/subtitles per frame | Keep Manim subtitle-free; precompute points/curves + drive updates with one `ValueTracker` updater; render subtitles in Hypit (`z=100`). |
| `Hypit` (Time windows) | `Timeline construction duration must resolve to a non-negative exact frame extent` | Use exact integer-frame durations at target fps (at `25 fps`, multiples of `0.04s`, e.g., `3.6s`, `5.0s`, `3.4s`, never `3.5s`). |
| `Hypit` (Assets) | `SOURCE_ASSET_OUTSIDE_ROOT` | Keep all `<asset:Video>` / `<asset:Audio>` files inside the Hypit project directory (or symlinked/copied inside `assets/`). |
| `Hypit` (`htmlVisual`) | Canvas `new Image().onload` races frame 0 capture | Embed base64 PNGs as DOM `<img src="data:image/png;base64,...">` in `htmlVisual.html`; use an upper `<canvas>` layer for iris wipes over `<img>`. |
| `Hypit` (`.svs` / `get`) | `SVS_RULE: Expected a dotted recipe path`; `hypit get` fails on existing file | Always use dotted keys (`film.hd`) in `.svs`; match full build IDs (`bld_[A-Za-z0-9_]+`), `rm -f` target MP4 first, and run `hypit runtime down` afterward. |
| Canvas 2D (`drawBadge` / opacity) | Inherited `textAlign` misaligns badges; overlapping translucent strokes double-blend | Wrap helpers in `ctx.save() ... ctx.restore()`; draw overlapping translucent ribbons at `alpha = 1.0` offscreen and composite once. |
| `rea-video` (`decompose`) | SSL download errors on Python 3.13 or `live_action` mislabels on procedural CG | Offline pipeline continues without optional UVR/YuNet downloads; always visually inspect `storyboard.jpg` before coding. |
| `ffmpeg` (GIF gradients) | High-bitrate full-frame plasma GIFs exceed 10+ MB with Bayer dither | Use a focused highlight window (`~3.5–4.5s`), modest resolution/fps (`~768×216`, `10 fps`), `stats_mode=diff`, and `dither=none` for smooth gradients. |
