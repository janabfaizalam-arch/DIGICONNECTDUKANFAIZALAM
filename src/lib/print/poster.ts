/**
 * The Digi Print counter poster, drawn in the browser.
 *
 * A5 portrait at 300 dpi (1748 × 2480), so it prints sharp on A5 and holds up
 * enlarged to A4. Drawn on a canvas rather than built as an image on the
 * server: the QR is made from the same URL the panel shows, there is nothing
 * to store, and it can never go stale against the code it encodes.
 *
 * Client-only. Uses the `qrcode` package already in the bundle.
 */

type PosterInput = {
  shopName: string;
  code: string;
  scanUrl: string;
  rates?: { a4_mono: number; a4_color: number };
};

const W = 1748;
const H = 2480;

const NAVY = "#071a4a";
const NAVY_2 = "#0b3f80";
const BLUE = "#2f80ed";
const FLAME = "#f25a00";
const INK = "#0b1736";
const BODY = "#4a5878";

const FONT = `"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrink a line of text until it fits the width. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, start: number) {
  let size = start;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && size > 28) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  return size;
}

function rupees(value: number) {
  return Number.isInteger(value) ? `₹${value}` : `₹${value.toFixed(2)}`;
}

/** Simple line icons, drawn so the poster needs no image assets. */
function drawStepIcon(ctx: CanvasRenderingContext2D, kind: number, cx: number, cy: number) {
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === 0) {
    // Scan: four corners and a line.
    const s = 34;
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * s, cy + dy * (s - 16));
      ctx.lineTo(cx + dx * s, cy + dy * s);
      ctx.lineTo(cx + dx * (s - 16), cy + dy * s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy);
    ctx.lineTo(cx + 22, cy);
    ctx.stroke();
  } else if (kind === 1) {
    // Upload: arrow into a tray.
    ctx.beginPath();
    ctx.moveTo(cx, cy + 14);
    ctx.lineTo(cx, cy - 30);
    ctx.moveTo(cx - 18, cy - 12);
    ctx.lineTo(cx, cy - 30);
    ctx.lineTo(cx + 18, cy - 12);
    ctx.moveTo(cx - 34, cy + 10);
    ctx.lineTo(cx - 34, cy + 32);
    ctx.lineTo(cx + 34, cy + 32);
    ctx.lineTo(cx + 34, cy + 10);
    ctx.stroke();
  } else if (kind === 2) {
    // Pay: a rupee sign.
    ctx.font = `900 74px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("₹", cx, cy + 4);
  } else {
    // Print: a printer.
    roundRect(ctx, cx - 38, cy - 12, 76, 38, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 12);
    ctx.lineTo(cx - 22, cy - 36);
    ctx.lineTo(cx + 22, cy - 36);
    ctx.lineTo(cx + 22, cy - 12);
    ctx.moveTo(cx - 20, cy + 14);
    ctx.lineTo(cx - 20, cy + 38);
    ctx.lineTo(cx + 20, cy + 38);
    ctx.lineTo(cx + 20, cy + 14);
    ctx.stroke();
  }
  ctx.restore();
}

export async function renderPrintPoster(input: PosterInput): Promise<string> {
  const QR = await import("qrcode");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = "#f3f6fc";
  ctx.fillRect(0, 0, W, H);

  const heroH = 1120;
  const hero = ctx.createLinearGradient(0, 0, W, heroH);
  hero.addColorStop(0, NAVY);
  hero.addColorStop(0.55, NAVY_2);
  hero.addColorStop(1, BLUE);
  ctx.fillStyle = hero;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, heroH - 120);
  ctx.quadraticCurveTo(W / 2, heroH + 90, 0, heroH - 120);
  ctx.closePath();
  ctx.fill();

  // Soft glows, for depth.
  for (const [x, y, r, colour] of [
    [W * 0.86, 160, 520, "rgba(242,90,0,0.28)"],
    [W * 0.1, 760, 560, "rgba(120,180,255,0.22)"],
  ] as const) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, colour);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, heroH);
  }

  // Fine dot grid in the hero.
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let y = 60; y < heroH - 160; y += 56) {
    for (let x = 60; x < W; x += 56) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Badge.
  const badge = "DIGI PRINT  •  SELF-SERVICE";
  ctx.font = `800 40px ${FONT}`;
  const badgeW = ctx.measureText(badge).width + 96;
  roundRect(ctx, (W - badgeW) / 2, 120, badgeW, 84, 42);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(badge, W / 2, 176);

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 176px ${FONT}`;
  ctx.fillText("Scan karo,", W / 2, 400);
  ctx.fillStyle = "#ffb27a";
  ctx.fillText("Print lo.", W / 2, 580);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = `600 54px ${FONT}`;
  ctx.fillText("Mobile se file ya photo bhejiye — turant print", W / 2, 690);

  // ── QR card ─────────────────────────────────────────────────────────────
  const cardW = 1180;
  const cardX = (W - cardW) / 2;
  const cardY = 790;
  const cardH = 1230;

  ctx.save();
  ctx.shadowColor = "rgba(7,26,74,0.35)";
  ctx.shadowBlur = 90;
  ctx.shadowOffsetY = 40;
  roundRect(ctx, cardX, cardY, cardW, cardH, 72);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  const qrSize = 900;
  const qrX = (W - qrSize) / 2;
  const qrY = cardY + 90;

  const qrCanvas = document.createElement("canvas");
  await QR.toCanvas(qrCanvas, input.scanUrl, {
    width: qrSize,
    margin: 0,
    errorCorrectionLevel: "Q",
    color: { dark: NAVY, light: "#ffffff" },
  });
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Corner brackets in the brand accent.
  ctx.strokeStyle = FLAME;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  const pad = 46;
  const arm = 120;
  for (const [x, y, dx, dy] of [
    [qrX - pad, qrY - pad, 1, 1],
    [qrX + qrSize + pad, qrY - pad, -1, 1],
    [qrX + qrSize + pad, qrY + qrSize + pad, -1, -1],
    [qrX - pad, qrY + qrSize + pad, 1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * arm);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * arm, y);
    ctx.stroke();
  }

  // Shop name and code under the QR.
  ctx.fillStyle = INK;
  const nameSize = fitText(ctx, input.shopName, cardW - 140, 900, 92);
  ctx.font = `900 ${nameSize}px ${FONT}`;
  ctx.fillText(input.shopName, W / 2, qrY + qrSize + 150);

  ctx.font = `700 46px ${FONT}`;
  ctx.fillStyle = BODY;
  ctx.fillText(`Counter code:  ${input.code}`, W / 2, qrY + qrSize + 225);

  // ── Steps ───────────────────────────────────────────────────────────────
  const steps = ["Scan", "File bhejo", "Pay karo", "Print lo"];
  const stepsY = 2140;
  const colW = W / steps.length;
  steps.forEach((label, index) => {
    const cx = colW * index + colW / 2;
    const circle = ctx.createLinearGradient(cx - 70, stepsY - 70, cx + 70, stepsY + 70);
    circle.addColorStop(0, index === 3 ? "#ff8a3d" : BLUE);
    circle.addColorStop(1, index === 3 ? FLAME : NAVY_2);
    ctx.fillStyle = circle;
    ctx.beginPath();
    ctx.arc(cx, stepsY, 74, 0, Math.PI * 2);
    ctx.fill();
    drawStepIcon(ctx, index, cx, stepsY);

    ctx.fillStyle = INK;
    ctx.font = `800 44px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(label, cx, stepsY + 128);

    if (index < steps.length - 1) {
      ctx.strokeStyle = "rgba(11,63,128,0.25)";
      ctx.lineWidth = 6;
      ctx.setLineDash([4, 18]);
      ctx.beginPath();
      ctx.moveTo(cx + 100, stepsY);
      ctx.lineTo(cx + colW - 100, stepsY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Rates line, when known.
  if (input.rates) {
    ctx.fillStyle = BODY;
    ctx.font = `700 42px ${FONT}`;
    ctx.fillText(
      `B/W A4 ${rupees(input.rates.a4_mono)} / page   •   Colour A4 ${rupees(input.rates.a4_color)} / page`,
      W / 2,
      stepsY + 192,
    );
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, H - 110, W, 110);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 38px ${FONT}`;
  ctx.fillText("UPI / Card se payment  •  File print ke baad turant delete  •  DigiConnect", W / 2, H - 44);

  return canvas.toDataURL("image/png");
}
