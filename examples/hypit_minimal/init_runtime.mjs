#!/usr/bin/env node
/**
 * Generate a local ./hypit.runtime.json by detecting Chrome/Chromium/Edge,
 * ffmpeg, and ffprobe across macOS, Linux, and Windows.
 * Optional overrides: HYPIT_CHROME_PATH, HYPIT_FFMPEG_PATH, HYPIT_FFPROBE_PATH.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const platform = process.platform;

function findOnPath(names) {
  const tool = platform === "win32" ? "where" : "which";
  for (const name of names) {
    try {
      const out = execFileSync(tool, [name], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
      if (first && fs.existsSync(first)) return first;
    } catch {
      // continue
    }
  }
  return null;
}

function findBinary(envKey, pathNames, candidatePaths) {
  const override = process.env[envKey];
  if (override) {
    if (fs.existsSync(override)) return override;
    throw new Error(`${envKey} is set to "${override}", but that file does not exist.`);
  }
  const fromPath = findOnPath(pathNames);
  if (fromPath) return fromPath;
  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

const chromeCandidates =
  platform === "darwin"
    ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      ]
    : platform === "win32"
      ? [
          path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
          path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
          path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
          path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Microsoft\\Edge\\Application\\msedge.exe"),
        ]
      : [
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/snap/bin/chromium",
        ];

const ffmpegCandidates =
  platform === "darwin"
    ? ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]
    : platform === "win32"
      ? ["C:\\ffmpeg\\bin\\ffmpeg.exe", path.join(process.env.LOCALAPPDATA || "", "Microsoft\\WinGet\\Links\\ffmpeg.exe")]
      : ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"];

const ffprobeCandidates =
  platform === "darwin"
    ? ["/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe"]
    : platform === "win32"
      ? ["C:\\ffmpeg\\bin\\ffprobe.exe", path.join(process.env.LOCALAPPDATA || "", "Microsoft\\WinGet\\Links\\ffprobe.exe")]
      : ["/usr/bin/ffprobe", "/usr/local/bin/ffprobe"];

const chromePath = findBinary(
  "HYPIT_CHROME_PATH",
  platform === "win32" ? ["chrome.exe", "msedge.exe"] : ["google-chrome", "chromium", "chromium-browser"],
  chromeCandidates,
);
const ffmpegPath = findBinary(
  "HYPIT_FFMPEG_PATH",
  platform === "win32" ? ["ffmpeg.exe"] : ["ffmpeg"],
  ffmpegCandidates,
);
const ffprobePath = findBinary(
  "HYPIT_FFPROBE_PATH",
  platform === "win32" ? ["ffprobe.exe"] : ["ffprobe"],
  ffprobeCandidates,
);

const missing = [];
if (!chromePath) missing.push("Chrome/Chromium (or set HYPIT_CHROME_PATH)");
if (!ffmpegPath) missing.push("ffmpeg (or set HYPIT_FFMPEG_PATH)");
if (!ffprobePath) missing.push("ffprobe (or set HYPIT_FFPROBE_PATH)");

if (missing.length > 0) {
  console.error("Failed to auto-detect required local binaries:\n  - " + missing.join("\n  - "));
  if (platform === "darwin") {
    console.error("Hint (macOS): brew install ffmpeg && brew install --cask google-chrome");
  } else if (platform === "linux") {
    console.error("Hint (Linux): sudo apt install ffmpeg chromium  # or install Google Chrome");
  } else if (platform === "win32") {
    console.error("Hint (Windows): winget install Gyan.FFmpeg  # and install Google Chrome");
  }
  process.exit(1);
}

const config = {
  format: "hypit.runtime-local@1",
  dataRoot: ".hypit/runtimes/local",
  credentials: {},
  endpoints: {
    "media.local": {
      use: "@hypit/media-local",
      config: { defaultConcurrency: 2 },
    },
    "html.local": {
      use: "@hypit/provider-html-local",
      config: {
        workers: 4,
        quality: "standard",
        defaultConcurrency: 1,
        chromePath,
        ffmpegPath,
        ffprobePath,
      },
    },
  },
  bindings: {},
};

const outPath = path.resolve(process.cwd(), "hypit.runtime.json");
fs.writeFileSync(outPath, JSON.stringify(config, null, 2) + "\n", "utf8");
console.log(`Wrote ${outPath}`);
console.log(`  chromePath : ${chromePath}`);
console.log(`  ffmpegPath : ${ffmpegPath}`);
console.log(`  ffprobePath: ${ffprobePath}`);
