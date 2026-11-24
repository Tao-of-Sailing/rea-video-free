import { sealVisualTrack } from "@hypit/composition";
import { htmlVisual } from "@hypit/html-program";

const CUES = [
  {
    id: 1,
    startSec: 0.0,
    endSec: 2.5,
    zh: "临界线上的黎曼 ζ 函数螺旋",
    en: "Riemann zeta spiral along the critical line s = 1/2 + it",
  },
  {
    id: 2,
    startSec: 2.5,
    endSec: 5.0,
    zh: "经 mpmath 数值核验并与 Hypit 字幕合成",
    en: "Verified with mpmath and composited with Hypit subtitles",
  },
];

export function renderMinimalCaptions(timeline, within, styleProps, options) {
  const fps = timeline.frameRate.numerator / timeline.frameRate.denominator;
  const totalFrames = timeline.frameCount;
  const zhColor = String(styleProps["zh-color"] || "#ffffff");
  const enColor = String(styleProps["en-color"] || "#f6f7fb");
  const zhSize = String(styleProps["zh-size"] || "30px");
  const enSize = String(styleProps["en-size"] || "24px");
  const bottomOffset = String(styleProps["bottom-offset"] || "56px");
  const fontZh = String(styleProps["font-zh"] || '"Hiragino Sans GB", "PingFang SC", sans-serif');
  const fontEn = String(styleProps["font-en"] || '"Avenir Next", "Helvetica Neue", Arial, sans-serif');

  const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  const presents = CUES.map((cue, order) => {
    const startFrame = Math.round(cue.startSec * fps);
    const endFrameExclusive = Math.min(totalFrames, Math.max(startFrame + 1, Math.round(cue.endSec * fps)));
    const program = htmlVisual({
      html: `<div class="cap-wrap"><div class="cap-block"><div class="zh">${esc(cue.zh)}</div><div class="en">${esc(cue.en)}</div></div></div>`,
      css: `
        :scope { pointer-events: none; }
        .cap-wrap {
          position: absolute; inset: 0;
          display: flex; justify-content: center; align-items: flex-end;
          padding-bottom: ${bottomOffset};
        }
        .cap-block { text-align: center; max-width: 1180px; padding: 0 20px; }
        .zh {
          font-family: ${fontZh}; font-size: ${zhSize}; font-weight: 700;
          color: ${zhColor}; line-height: 1.25;
          -webkit-text-stroke: 3px #0f1320;
          paint-order: stroke fill;
          text-shadow: 0 2px 6px rgba(10,14,24,0.5);
        }
        .en {
          font-family: ${fontEn}; font-size: ${enSize}; font-weight: 600;
          color: ${enColor}; line-height: 1.25; margin-top: 4px;
          -webkit-text-stroke: 2.5px #0f1320;
          paint-order: stroke fill;
          text-shadow: 0 2px 6px rgba(10,14,24,0.5);
        }
      `,
    });
    return {
      id: `min-sub-${cue.id}`,
      order,
      z: options.stackingOrder,
      span: { startFrame, endFrameExclusive },
      elements: [{
        id: `min-sub-el-${cue.id}`,
        kind: "program",
        order: 0,
        program,
        style: [
          { name: "position", value: "absolute" },
          { name: "left", value: `${within.xPx}px` },
          { name: "top", value: `${within.yPx}px` },
          { name: "width", value: `${within.widthPx}px` },
          { name: "height", value: `${within.heightPx}px` },
        ],
      }],
    };
  });

  return sealVisualTrack({
    id: options.id,
    timelineId: timeline.id,
    visualIr: "hypit.visual-ir@1",
    presents,
  });
}
