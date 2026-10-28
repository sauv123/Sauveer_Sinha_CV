import * as THREE from './vendor/three.module.js';
import { PaperSoundEngine } from './paper-audio.js?v=9';

/**
 * Interactive 3D Physical Paper Resume with 6 Die-Cut Colored Shaped Personality Stickers
 * - Front surface: 100% verbatim original PDF resume (596 × 842 pt, A4 ratio)
 * - Behind the resume: 6 custom-shaped, colorful 3D die-cut personality stickers with custom vector icons
 *   and Sauveer Sinha's personal story
 * - Permanent, calibrated 3D studio perspective for optimal depth and reading legibility
 * - Delayed 2.4s side intimation + subtle corner beckon inviting the viewer to turn the page over
 * - Sound enabled by default on first interaction + highlighted Download CV action
 */

const PAGE_WIDTH = 5.96;
const PAGE_HEIGHT = 8.42;
const PAPER_THICKNESS = 0.013;
const SEGMENTS_X = 160;
const SEGMENTS_Y = 224;

// Physical dimensions of each 3D Die-Cut Sticker on the back of the resume (Bigger!)
const NOTE_WIDTH = 2.86;
const NOTE_HEIGHT = 2.74;

// Discrete display transition feature detection from modern-web-guidance (animate-element-entry-exit)
let supportsDisplayTransition;
function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

async function hideElement(el) {
  if (!el || el.hidden) return;
  if (canTransitionDisplay()) {
    el.hidden = true;
  } else {
    el.setAttribute('data-closing', '');
  }

  const animations = el.getAnimations ? el.getAnimations() : [];
  if (animations.length > 0) {
    await Promise.race([
      Promise.allSettled(animations.map((a) => a.finished)),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  }

  if (el.hasAttribute('data-closing')) {
    el.removeAttribute('data-closing');
    el.hidden = true;
  }
}

function showElement(el) {
  if (!el) return;
  el.removeAttribute('data-closing');
  el.hidden = false;
}

// The 6 Colored Shaped Personality Stickers on the Back of the Resume
export const STICKY_NOTES_DATA = [
  {
    id: 'sticker-01',
    col: 0,
    row: 0,
    shape: 'stamp',
    artefactType: 'camera-35mm',
    stickerBg: '#F04D24', // Vibrant Aperol Terracotta
    stickerBg2: '#D43612',
    stickerText: '#FFFDF9',
    stickerSubText: '#FFEFE7',
    angleDeg: -1.6,
    title: 'I notice the little things.',
    body: 'I’ve been taking photos since I was 14. Somewhere along the way, I started noticing more than just what’s in front of me, little details, strange moments, and the way people interact with the world.',
  },
  {
    id: 'sticker-02',
    col: 1,
    row: 0,
    shape: 'starburst',
    artefactType: 'browser-tabs',
    stickerBg: '#FFBE18', // Sunburst Marigold Gold
    stickerBg2: '#F59E0B',
    stickerText: '#17130A',
    stickerSubText: '#2B210B',
    angleDeg: 1.7,
    title: 'My brain has too many tabs open.',
    body: 'One minute it’s UX, the next it’s AI, an odd everyday object, or an idea I probably shouldn’t start at midnight. I like following those connections to see where they lead.',
  },
  {
    id: 'sticker-03',
    col: 0,
    row: 1,
    shape: 'ticket',
    artefactType: 'google-search-3d',
    stickerBg: '#1947E5', // Electric Cobalt Klein Blue
    stickerBg2: '#1034B8',
    stickerText: '#FFFFFF',
    stickerSubText: '#E4EEFF',
    angleDeg: 1.3,
    title: 'Google is my unofficial teacher.',
    body: 'I taught myself 3D, explored tools by breaking things, and keep learning by making. I don’t need to know everything before I start. I just need enough to give it a go.',
  },
  {
    id: 'sticker-04',
    col: 1,
    row: 1,
    shape: 'hexagon',
    artefactType: 'print-to-ux',
    stickerBg: '#0D9456', // Studio Matcha Emerald
    stickerBg2: '#077541',
    stickerText: '#F7FFF9',
    stickerSubText: '#DCFAEC',
    angleDeg: -1.5,
    title: 'I’ve never been just one thing.',
    body: 'UX, product, engineering, art direction, emerging tech. My path hasn’t been a straight line, and I quite like that. Each discipline gives me another way to look at a problem.',
  },
  {
    id: 'sticker-05',
    col: 0,
    row: 2,
    shape: 'speech',
    artefactType: 'espresso-cups',
    stickerBg: '#6D28D9', // Royal Studio Violet
    stickerBg2: '#5218B5',
    stickerText: '#FFFFFF',
    stickerSubText: '#F2EEFF',
    angleDeg: -1.4,
    title: 'I like people more than pixels.',
    body: 'I love a good conversation, shared laughs, and making people feel included. I care about the work, but I also care about the people making it with me. Good energy matters.',
  },
  {
    id: 'sticker-06',
    col: 1,
    row: 2,
    shape: 'octagon',
    artefactType: 'pulse-prototype',
    stickerBg: '#E11D48', // Warm Rose Crimson
    stickerBg2: '#BE123C',
    stickerText: '#FFFFFF',
    stickerSubText: '#FFEBEF',
    angleDeg: 1.6,
    title: 'I like ideas with a pulse.',
    body: 'An idea is exciting. A prototype is better. Something real that people can try, react to, and make their own? That’s the bit I want to get to. I like taking things from zero to shipped.',
  },
];

// Interactive links from the PDF header
const PDF_LINKS = [
  {
    label: 'Email sauveersinha@gmail.com',
    href: 'mailto:sauveersinha@gmail.com',
    uMin: 220.1 / 596.0,
    uMax: 326.1 / 596.0,
    vMin: 1.0 - 68.5 / 842.0,
    vMax: 1.0 - 52.5 / 842.0,
  },
  {
    label: 'Visit www.sauveer.com',
    href: 'https://www.sauveer.com',
    uMin: 332.6 / 596.0,
    uMax: 413.3 / 596.0,
    vMin: 1.0 - 68.5 / 842.0,
    vMax: 1.0 - 52.5 / 842.0,
  },
  {
    label: 'Open LinkedIn profile linkedin.com/in/sauveer',
    href: 'https://linkedin.com/in/sauveer',
    uMin: 419.5 / 596.0,
    uMax: 518.3 / 596.0,
    vMin: 1.0 - 68.5 / 842.0,
    vMax: 1.0 - 52.5 / 842.0,
  },
];

/**
 * Computes the home (x, y) coordinates on the back of the resume sheet for a given sticker.
 */
function getNoteHomePosition(note) {
  const colOffset = note.col === 0 ? -1.39 : 1.39;
  const rowOffsets = [2.62, 0.0, -2.62];
  return {
    x: colOffset,
    y: rowOffsets[note.row] || 0.0,
    rotZ: (note.angleDeg * Math.PI) / 180,
  };
}

/**
 * Helper to wrap text on a 2D canvas context.
 */
function drawWrappedCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[i] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, curY);
    curY += lineHeight;
  }
  return curY;
}

/**
 * Traces a custom rounded polygon using `arcTo` between vertices.
 */
function traceRoundedPolygon(ctx, pts, radius) {
  const n = pts.length;
  if (n < 3) return;
  const startX = (pts[n - 1].x + pts[0].x) * 0.5;
  const startY = (pts[n - 1].y + pts[0].y) * 0.5;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    ctx.arcTo(p1.x, p1.y, p2.x, p2.y, radius);
  }
  ctx.closePath();
}

/**
 * Draws a rich, tactile, multi-tone Personal Artefact illustration at (cx, cy):
 * 1. 'camera-35mm': Vintage 35mm analog rangefinder camera (taking photos since age 14)
 * 2. 'browser-tabs': Stacked late-night browser window with 7 colorful open tabs
 * 3. 'google-search-3d': Tactile Google search bar with a 3D wireframe cube popping out
 * 4. 'print-to-ux': Fanned CMYK print swatch cards morphing into a UX vector Bezier path
 * 5. 'espresso-cups': Two clinking ceramic espresso cups with warm rising steam
 * 6. 'pulse-prototype': Live prototype device screen with a glowing heartbeat ECG pulse wave
 */
function drawPersonalArtefact(ctx, note, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.36, 1.36);
  ctx.shadowColor = 'rgba(14, 12, 10, 0.24)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;

  const type = note.artefactType;

  if (type === 'camera-35mm') {
    ctx.rotate(-0.045);
    const w = 148;
    const h = 92;

    // Red shutter release button & silver wind lever on top
    ctx.fillStyle = '#FF3B30';
    ctx.beginPath();
    ctx.roundRect(-w * 0.34, -h * 0.5 - 12, 22, 14, 4);
    ctx.fill();

    ctx.fillStyle = '#E5E0D5';
    ctx.beginPath();
    ctx.roundRect(w * 0.16, -h * 0.5 - 10, 28, 12, 3);
    ctx.fill();

    // Main camera body (charcoal vulcanite leatherette)
    ctx.fillStyle = '#1E1C1A';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5, -h * 0.5, w, h, 14);
    ctx.fill();

    // Brushed champagne-silver top plate
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#F3EFE6';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5, -h * 0.5, w, 30, [14, 14, 0, 0]);
    ctx.fill();

    // Rangefinder viewfinder glass window & red dot badge
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#1E1C1A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(w * 0.16, -h * 0.5 + 7, 28, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.arc(-w * 0.30, -h * 0.5 + 15, 6, 0, Math.PI * 2);
    ctx.fill();

    // 35mm Prime Lens Barrel (Silver outer ring + dark anodized barrel + sapphire coated glass)
    const lx = 0;
    const ly = 8;
    ctx.fillStyle = '#E7E2D8';
    ctx.beginPath();
    ctx.arc(lx, ly, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#141312';
    ctx.beginPath();
    ctx.arc(lx, ly, 29, 0, Math.PI * 2);
    ctx.fill();

    const lensGrad = ctx.createLinearGradient(lx - 18, ly - 18, lx + 18, ly + 18);
    lensGrad.addColorStop(0, '#1D4ED8');
    lensGrad.addColorStop(0.55, '#0F172A');
    lensGrad.addColorStop(1, '#4338CA');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(lx, ly, 21, 0, Math.PI * 2);
    ctx.fill();

    // Lens reflection highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.beginPath();
    ctx.ellipse(lx - 7, ly - 7, 6, 3.2, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.beginPath();
    ctx.arc(lx + 7, ly + 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'browser-tabs') {
    ctx.rotate(0.035);
    const w = 172;
    const h = 96;

    // Back browser window shadow card
    ctx.fillStyle = '#27272A';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5 - 8, -h * 0.5 - 8, w, h, 12);
    ctx.fill();

    // Main browser window
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5, -h * 0.5, w, h, 12);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Crowded row of 6 colorful open tabs along the top bar
    const tabColors = ['#F43F5E', '#38BDF8', '#A855F7', '#10B981', '#F59E0B', '#EC4899'];
    const tabLabels = ['UX', 'AI', '3D', 'OBJ', '14', '?'];
    const startX = -w * 0.5 + 10;
    const tabW = 24;
    for (let i = 0; i < 6; i++) {
      const tx = startX + i * 25;
      ctx.fillStyle = tabColors[i];
      ctx.beginPath();
      ctx.roundRect(tx, -h * 0.5 + 7, tabW, 18, [5, 5, 0, 0]);
      ctx.fill();

      ctx.font = '800 10px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tabLabels[i], tx + tabW * 0.5, -h * 0.5 + 16);
    }

    // Active viewport inside browser
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5 + 8, -h * 0.5 + 24, w - 16, h - 32, 7);
    ctx.fill();

    // Connected midnight idea nodes inside the browser canvas
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-48, 12);
    ctx.lineTo(-10, -2);
    ctx.lineTo(34, 14);
    ctx.stroke();

    ctx.fillStyle = '#F04D24';
    ctx.beginPath();
    ctx.arc(-48, 12, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1947E5';
    ctx.beginPath();
    ctx.arc(-10, -2, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0D9456';
    ctx.beginPath();
    ctx.arc(34, 14, 8, 0, Math.PI * 2);
    ctx.fill();

    // Midnight pill badge
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.roundRect(14, -18, 56, 18, 999);
    ctx.fill();
    ctx.font = '800 10px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFBE18';
    ctx.fillText('00:14 AM', 42, -9);
  } else if (type === 'google-search-3d') {
    // Tactile floating Google-style search bar + 3D wireframe cube popping out of it
    const barW = 176;
    const barH = 50;

    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(-barW * 0.5, 4, barW, barH, 999);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Colorful 'G' emblem on the left of the search bar
    const gx = -barW * 0.5 + 26;
    const gy = 29;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.strokeStyle = '#EA4335';
    ctx.arc(gx, gy, 11, -0.8 * Math.PI, -0.15 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = '#FBBC05';
    ctx.arc(gx, gy, 11, 0.75 * Math.PI, 1.2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = '#34A853';
    ctx.arc(gx, gy, 11, 0.15 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = '#4285F4';
    ctx.arc(gx, gy, 11, -0.05 * Math.PI, 0.2 * Math.PI);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 11, gy);
    ctx.stroke();

    // Search text "how to 3D|"
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#18181B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('how to 3D', gx + 20, gy + 1);

    // Blinking blue caret
    ctx.strokeStyle = '#1947E5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx + 112, gy - 10);
    ctx.lineTo(gx + 112, gy + 10);
    ctx.stroke();

    // 3D Isometric Shaded + Wireframe Cube bursting out of the top-right of the search bar
    const cx3 = 52;
    const cy3 = -14;
    const r = 28;
    const dx = r * 0.866;
    const dy = r * 0.5;

    // Top face
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(cx3, cy3 - r);
    ctx.lineTo(cx3 + dx, cy3 - dy);
    ctx.lineTo(cx3, cy3);
    ctx.lineTo(cx3 - dx, cy3 - dy);
    ctx.closePath();
    ctx.fill();

    // Left face
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(cx3 - dx, cy3 - dy);
    ctx.lineTo(cx3, cy3);
    ctx.lineTo(cx3, cy3 + r);
    ctx.lineTo(cx3 - dx, cy3 + dy);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.moveTo(cx3, cy3);
    ctx.lineTo(cx3 + dx, cy3 - dy);
    ctx.lineTo(cx3 + dx, cy3 + dy);
    ctx.lineTo(cx3, cy3 + r);
    ctx.closePath();
    ctx.fill();

    // Crisp wireframe outline
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx3, cy3 - r);
    ctx.lineTo(cx3 + dx, cy3 - dy);
    ctx.lineTo(cx3 + dx, cy3 + dy);
    ctx.lineTo(cx3, cy3 + r);
    ctx.lineTo(cx3 - dx, cy3 + dy);
    ctx.lineTo(cx3 - dx, cy3 - dy);
    ctx.closePath();
    ctx.moveTo(cx3 - dx, cy3 - dy);
    ctx.lineTo(cx3, cy3);
    ctx.lineTo(cx3 + dx, cy3 - dy);
    ctx.moveTo(cx3, cy3);
    ctx.lineTo(cx3, cy3 + r);
    ctx.stroke();
  } else if (type === 'print-to-ux') {
    // Multi-disciplinary Craft Collage: UX Wireframe Card + Engineering Code Node </> + Art Direction Swatch & Vector Bezier Curve
    // 1. Left Card: UX / Product Wireframe Interface Card
    ctx.save();
    ctx.translate(-38, 4);
    ctx.rotate(-0.22);
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(-28, -40, 56, 74, 7);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // Header bar
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.roundRect(-22, -34, 44, 14, 4);
    ctx.fill();
    // Wireframe blocks
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-22, -14, 26, 6);
    ctx.fillStyle = '#A1A1AA';
    ctx.fillRect(-22, -4, 38, 5);
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.roundRect(-22, 7, 44, 18, 4);
    ctx.fill();
    ctx.restore();

    // 2. Center Badge: Engineering Code Terminal Card (`</>`)
    ctx.save();
    ctx.translate(2, -4);
    ctx.rotate(0.05);
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.roundRect(-28, -36, 56, 68, 8);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // Window dots
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.arc(-18, -26, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(-10, -26, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(-2, -26, 3, 0, Math.PI * 2);
    ctx.fill();
    // Crisp `</>` engineering symbol
    ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('</>', 0, 2);
    ctx.restore();

    // 3. Right Card: Art Direction Color Swatch & Typography Card
    ctx.save();
    ctx.translate(38, 6);
    ctx.rotate(0.24);
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(-24, -38, 48, 70, 7);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FFBE0B';
    ctx.beginPath();
    ctx.roundRect(-19, -33, 38, 40, 4);
    ctx.fill();
    ctx.font = '800 16px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", serif';
    ctx.fillStyle = '#18181B';
    ctx.textAlign = 'center';
    ctx.fillText('Aa', 0, -12);
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-19, 13, 24, 4);
    ctx.restore();

    ctx.shadowColor = 'transparent';

    // 4. Sweeping Art-Direction / UX Vector Bezier Path connecting all disciplines
    ctx.strokeStyle = '#FFFDF9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-58, 24);
    ctx.bezierCurveTo(-12, -42, 24, 38, 66, -18);
    ctx.stroke();

    // Tangent handle line
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(42, 6);
    ctx.lineTo(74, -26);
    ctx.stroke();

    // Square vector anchor points
    const anchors = [
      { x: -58, y: 24 },
      { x: 66, y: -18 },
    ];
    for (const a of anchors) {
      ctx.fillStyle = '#FFFDF9';
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 2.5;
      ctx.fillRect(a.x - 6, a.y - 6, 12, 12);
      ctx.strokeRect(a.x - 6, a.y - 6, 12, 12);
    }
  } else if (type === 'espresso-cups') {
    // Two Clinking Italian Espresso Cups with Rising Warm Steam
    // Left Cup (tilted right)
    ctx.save();
    ctx.translate(-30, 12);
    ctx.rotate(0.14);
    // Handle
    ctx.strokeStyle = '#FFFDF9';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.arc(-26, -2, 11, 0.5 * Math.PI, 1.5 * Math.PI);
    ctx.stroke();
    // Cup body
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(-26, -22, 52, 42, [4, 4, 22, 22]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // Warm terracotta stripe
    ctx.fillStyle = '#F04D24';
    ctx.fillRect(-25, -10, 50, 7);
    // Espresso crema inside rim
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.ellipse(0, -21, 23, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right Cup (tilted left, clinking!)
    ctx.save();
    ctx.translate(30, 10);
    ctx.rotate(-0.15);
    // Handle
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.arc(26, -2, 11, -0.5 * Math.PI, 0.5 * Math.PI);
    ctx.stroke();
    // Cup body
    ctx.fillStyle = '#FDE68A';
    ctx.beginPath();
    ctx.roundRect(-26, -22, 52, 42, [4, 4, 22, 22]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // Cobalt stripe
    ctx.fillStyle = '#1947E5';
    ctx.fillRect(-25, -10, 50, 7);
    // Espresso crema
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.ellipse(0, -21, 23, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.shadowColor = 'transparent';
    // Joyful clink spark lines & rising steam above the cups
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(0, -38);
    ctx.moveTo(-12, -20);
    ctx.lineTo(-22, -32);
    ctx.moveTo(12, -20);
    ctx.lineTo(22, -32);
    ctx.stroke();

    // Soft rising steam curls
    ctx.strokeStyle = 'rgba(255, 253, 249, 0.78)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-34, -18);
    ctx.bezierCurveTo(-42, -28, -26, -34, -34, -44);
    ctx.moveTo(34, -20);
    ctx.bezierCurveTo(42, -30, 26, -36, 34, -46);
    ctx.stroke();
  } else {
    // 'pulse-prototype': Tactile Hardware Prototype Screen with Live ECG Heartbeat Wave
    const w = 166;
    const h = 92;

    // Warm cream hardware casing
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5, -h * 0.5, w, h, 16);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Dark OLED oscilloscope/prototype screen
    ctx.fillStyle = '#141218';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5 + 10, -h * 0.5 + 10, w - 20, h - 20, 10);
    ctx.fill();

    // Glowing green "LIVE" LED dot + label
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(-w * 0.5 + 24, -h * 0.5 + 23, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '800 10px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#A7F3D0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHIPPED', -w * 0.5 + 33, -h * 0.5 + 23);

    // Glowing Heartbeat ECG Pulse Waveform across the screen
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-w * 0.5 + 22, 10);
    ctx.lineTo(-28, 10);
    ctx.lineTo(-18, 22);
    ctx.lineTo(-4, -22);
    ctx.lineTo(10, 26);
    ctx.lineTo(22, -4);
    ctx.lineTo(32, 10);
    ctx.lineTo(w * 0.5 - 22, 10);
    ctx.stroke();

    // Glowing pulse head dot on the right
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(w * 0.5 - 22, 10, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Traces the custom die-cut silhouette path for each of the 6 personality sticker shapes:
 * - 'stamp': Wavy scalloped studio seal
 * - 'starburst': 12-lobe rounded sunburst badge
 * - 'ticket': Notched transit/cinema ticket stub
 * - 'hexagon': Rounded Swiss crest / shield
 * - 'speech': Plush rounded speech bubble with bottom-left callout tail
 * - 'octagon': Chamfered 8-sided retro studio plaque
 */
function traceStickerShapePath(ctx, shapeType, cx, cy, rx, ry) {
  if (shapeType === 'stamp') {
    const steps = 192;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const pExp = 4.2;
      const rSuper = Math.pow(Math.pow(Math.abs(c), pExp) + Math.pow(Math.abs(s), pExp), -1 / pExp);
      const scallop = 1.0 + 0.030 * Math.cos(18 * t);
      const px = cx + rx * 0.95 * rSuper * scallop * c;
      const py = cy + ry * 0.94 * rSuper * scallop * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    return;
  }

  if (shapeType === 'starburst') {
    const steps = 192;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const rSuper = Math.pow(Math.pow(Math.abs(c), 2.7) + Math.pow(Math.abs(s), 2.7), -1 / 2.7);
      const lobe = 0.955 + 0.050 * Math.cos(12 * t);
      const px = cx + rx * 0.97 * rSuper * lobe * c;
      const py = cy + ry * 0.96 * rSuper * lobe * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    return;
  }

  if (shapeType === 'ticket') {
    const w = rx * 0.96;
    const h = ry * 0.92;
    const ch = Math.min(w, h) * 0.14;
    const notchR = h * 0.16;

    ctx.beginPath();
    ctx.moveTo(cx - w + ch, cy - h);
    ctx.lineTo(cx + w - ch, cy - h);
    ctx.lineTo(cx + w, cy - h + ch);
    ctx.lineTo(cx + w, cy - notchR);
    ctx.arc(cx + w, cy, notchR, -Math.PI * 0.5, Math.PI * 0.5, true);
    ctx.lineTo(cx + w, cy + h - ch);
    ctx.lineTo(cx + w - ch, cy + h);
    ctx.lineTo(cx - w + ch, cy + h);
    ctx.lineTo(cx - w, cy + h - ch);
    ctx.lineTo(cx - w, cy + notchR);
    ctx.arc(cx - w, cy, notchR, Math.PI * 0.5, -Math.PI * 0.5, true);
    ctx.lineTo(cx - w, cy - h + ch);
    ctx.closePath();
    return;
  }

  if (shapeType === 'hexagon') {
    const w = rx * 0.98;
    const h = ry * 0.97;
    const pts = [
      { x: cx, y: cy - h },
      { x: cx + w, y: cy - h * 0.55 },
      { x: cx + w, y: cy + h * 0.55 },
      { x: cx, y: cy + h },
      { x: cx - w, y: cy + h * 0.55 },
      { x: cx - w, y: cy - h * 0.55 },
    ];
    traceRoundedPolygon(ctx, pts, Math.min(w, h) * 0.24);
    return;
  }

  if (shapeType === 'speech') {
    const w = rx * 0.96;
    const topY = cy - ry * 0.94;
    const botY = cy + ry * 0.82;
    const r = Math.min(w, ry) * 0.30;

    ctx.beginPath();
    ctx.moveTo(cx - w + r, topY);
    ctx.lineTo(cx + w - r, topY);
    ctx.quadraticCurveTo(cx + w, topY, cx + w, topY + r);
    ctx.lineTo(cx + w, botY - r);
    ctx.quadraticCurveTo(cx + w, botY, cx + w - r, botY);
    ctx.lineTo(cx - w * 0.16, botY);
    ctx.lineTo(cx - w * 0.42, cy + ry * 0.99);
    ctx.lineTo(cx - w * 0.46, botY);
    ctx.lineTo(cx - w + r, botY);
    ctx.quadraticCurveTo(cx - w, botY, cx - w, botY - r);
    ctx.lineTo(cx - w, topY + r);
    ctx.quadraticCurveTo(cx - w, topY, cx - w + r, topY);
    ctx.closePath();
    return;
  }

  // Default / 'octagon': Chamfered 8-Sided Retro Studio Plaque
  const w = rx * 0.96;
  const h = ry * 0.93;
  const cutX = w * 0.24;
  const cutY = h * 0.24;
  const pts = [
    { x: cx - w + cutX, y: cy - h },
    { x: cx + w - cutX, y: cy - h },
    { x: cx + w, y: cy - h + cutY },
    { x: cx + w, y: cy + h - cutY },
    { x: cx + w - cutX, y: cy + h },
    { x: cx - w + cutX, y: cy + h },
    { x: cx - w, y: cy + h - cutY },
    { x: cx - w, y: cy - h + cutY },
  ];
  traceRoundedPolygon(ctx, pts, Math.min(w, h) * 0.09);
}

/**
 * Renders an individual custom-shaped Die-Cut Vinyl Personality Sticker (`920 × 860` RGBA canvas)
 * with a rich illustrated personal artefact, larger headline, and larger body typography
 * (no inner lining, no numbers, no hyphens).
 */
function createSingleStickerTexture(note, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 920;
  canvas.height = 860;
  const ctx = canvas.getContext('2d');

  const W = canvas.width;
  const H = canvas.height;
  const cx = W * 0.5;
  const cy = H * 0.5;
  const rx = W * 0.445;
  const ry = H * 0.44;

  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Trace custom silhouette path
  traceStickerShapePath(ctx, note.shape, cx, cy, rx, ry);

  // 2. Outer kiss-cut vinyl bevel edge + thick creamy-white vinyl border
  ctx.strokeStyle = 'rgba(20, 18, 14, 0.22)';
  ctx.lineWidth = 52;
  ctx.stroke();

  ctx.strokeStyle = '#FFFDF9';
  ctx.lineWidth = 46;
  ctx.stroke();

  // 3. Vibrant colored vinyl fill with rich radial/linear depth gradient
  const bgGrad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.8, cy + ry);
  bgGrad.addColorStop(0, note.stickerBg);
  bgGrad.addColorStop(1, note.stickerBg2 || note.stickerBg);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // 4. Clip to the sticker interior for vinyl gloss sheen, personal artefact, and big typography
  ctx.save();
  ctx.clip();

  // Diagonal satin vinyl sheen highlight across the top-left of the sticker
  const sheenGrad = ctx.createLinearGradient(0, 0, W * 0.85, H * 0.85);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  sheenGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.03)');
  sheenGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.0)');
  sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.10)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, W, H);

  const contentCenterY = note.shape === 'speech' ? cy - 28 : cy;

  // 5. Personal Artefact Illustration at Top (scaled 1.36x)
  drawPersonalArtefact(ctx, note, cx, contentCenterY - 210);

  // 6. Big Bold Personality Headline
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 48px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = note.stickerText;
  const titleMaxW = note.shape === 'hexagon' ? 610 : note.shape === 'starburst' ? 600 : 665;
  const afterTitleY = drawWrappedCanvasText(
    ctx,
    note.title,
    cx,
    contentCenterY - 72,
    titleMaxW,
    53
  );

  // 7. Bigger, Crisp Personality Body Text (No divider lines, no inner borders, no hyphens)
  const bodyMaxW = note.shape === 'hexagon' ? 585 : note.shape === 'ticket' ? 580 : 635;
  ctx.font = '600 32.5px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = note.stickerSubText;
  drawWrappedCanvasText(ctx, note.body, cx, afterTitleY + 18, bodyMaxW, 42);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  if (renderer) {
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return { texture: tex, canvas };
}

/**
 * Renders the composite Reverse Surface texture (`uBackTex`) of the resume sheet:
 * - Warm 120gsm cotton paper stock
 * - Editorial studio header ("BEHIND THE RESUME · THE HUMAN SIDE OF SAUVEER SINHA")
 * - When the resume sheet curls in 3D (`showAttachedInTexture === true`), draws all 6 stickers
 *   directly onto `uBackTex` so they bend seamlessly around the 3D cylinder/cone curl!
 */
function updateBackSheetCompositeTexture(backCanvas, stickyNotesList, showAttachedInTexture, backTex) {
  const ctx = backCanvas.getContext('2d');
  const W = backCanvas.width;
  const H = backCanvas.height;

  // 1. Archival 120gsm warm cotton paper base
  ctx.fillStyle = '#fbf9f5';
  ctx.fillRect(0, 0, W, H);

  // 2. Subtle editorial grid border & header caption on the back of the resume
  ctx.strokeStyle = 'rgba(11, 79, 179, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  ctx.font = '700 25px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(24, 22, 18, 0.48)';
  ctx.textAlign = 'center';
  ctx.fillText(
    'BEHIND THE RESUME · THE HUMAN SIDE OF SAUVEER SINHA',
    W * 0.5,
    114
  );
  ctx.textAlign = 'left';

  // 3. During active 3D curling, composite the 6 stickers onto the curling sheet texture
  if (showAttachedInTexture) {
    for (const item of stickyNotesList) {
      const note = item.data;
      const home = getNoteHomePosition(note);

      const px = ((home.x + PAGE_WIDTH * 0.5) / PAGE_WIDTH) * W;
      const py = ((PAGE_HEIGHT * 0.5 - home.y) / PAGE_HEIGHT) * H;
      const pw = (NOTE_WIDTH / PAGE_WIDTH) * W;
      const ph = (NOTE_HEIGHT / PAGE_HEIGHT) * H;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-home.rotZ);
      ctx.shadowColor = 'rgba(20, 18, 14, 0.22)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 16;
      ctx.drawImage(item.stickerCanvas, -pw * 0.5, -ph * 0.5, pw, ph);
      ctx.restore();
    }
  }

  backTex.needsUpdate = true;
}

// 3D Die-Cut Sticker Vertex & Fragment Shaders (Alpha Silhouette Cutout, Satin Vinyl Sheen & Corner Lift)
const STICKY_VERTEX_SHADER = /* glsl */ `
  uniform float uHoverLift;
  uniform float uPeelLift;
  uniform float uIsShadowPass;
  uniform vec2 uLightOffset;

  varying vec2 vUv;
  varying float vLocalLift;
  varying vec3 vNormalApprox;

  void main() {
    vUv = uv;

    // Top 20% is flat; bottom & lower-right peel tab curl upward naturally
    float freeCoord = clamp((0.82 - uv.y) / 0.82, 0.0, 1.0);

    float jCurl = pow(freeCoord, 1.75) * (0.036 + 0.095 * uHoverLift + 0.14 * uPeelLift);
    float cornerDogEar = pow(freeCoord * uv.x, 2.0) * (0.048 + 0.068 * uHoverLift);
    float zLift = jCurl + cornerDogEar;
    vLocalLift = zLift;

    float dzdy = -1.75 * pow(max(freeCoord, 0.001), 0.75) * (0.036 + 0.095 * uHoverLift + 0.14 * uPeelLift);
    float dzdx = 2.0 * pow(max(freeCoord * uv.x, 0.001), 1.0) * freeCoord * (0.048 + 0.068 * uHoverLift);
    vNormalApprox = normalize(vec3(-dzdx, -dzdy, 1.0));

    vec3 pos = position;
    if (uIsShadowPass > 0.5) {
      pos.xy += uLightOffset * (zLift + 0.025 * uPeelLift);
      pos.z = 0.0015;
    } else {
      pos.z += zLift + 0.06 * uPeelLift;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const STICKY_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uNoteTex;
  uniform float uHoverLift;
  uniform float uPeelLift;
  uniform float uIsShadowPass;
  uniform vec3 uLightDir;

  varying vec2 vUv;
  varying float vLocalLift;
  varying vec3 vNormalApprox;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  void main() {
    vec4 texColor = texture2D(uNoteTex, vUv);

    if (texColor.a < 0.08) {
      discard;
    }

    if (uIsShadowPass > 0.5) {
      float alphaMask = smoothstep(0.08, 0.55, texColor.a);
      float shadowAlpha = (0.15 + 0.19 * clamp(vLocalLift * 5.5, 0.0, 1.0) + 0.08 * uPeelLift) * alphaMask;
      gl_FragColor = vec4(0.08, 0.07, 0.06, shadowAlpha);
      return;
    }

    float grain = (hash21(vUv * 420.0) - 0.5) * 0.007;

    vec3 N = normalize(vNormalApprox);
    vec3 L = normalize(uLightDir);
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float NdotL = clamp(dot(N, L), 0.0, 1.0);
    float vinylSpec = pow(clamp(dot(N, H), 0.0, 1.0), 22.0) * (0.05 + 0.10 * uHoverLift + 0.10 * uPeelLift);
    float lightMod = 0.95 + 0.08 * NdotL + 0.04 * clamp(vLocalLift * 4.0, 0.0, 1.0);

    vec3 finalRgb = clamp(texColor.rgb * lightMod + vec3(vinylSpec + grain), 0.0, 1.0);
    gl_FragColor = vec4(finalRgb, texColor.a);
  }
`;

// Omni-directional 360-degree GLSL developable surface deformation
const PAPER_DEFORM_GLSL = /* glsl */ `
  uniform float uProgress;
  uniform vec2 uCurlAxis;
  uniform float uVelocityFlex;
  uniform float uPaperThickness;

  varying vec2 vUv;
  varying float vLayer;
  varying float vIsEdge;
  varying vec3 vNormalLocal;
  varying vec3 vWorldPos;
  varying float vLiftHeight;
  varying float vFoldSignedDist;
  varying float vCurlRadius;
  varying float vOverhangReach;

  float sstep(float e0, float e1, float x) {
    float t = clamp((x - e0) / max(e1 - e0, 0.0001), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  vec3 evaluatePaperSurface(
    vec2 posXY,
    out float outLift,
    out float outXi,
    out float outRadius,
    out float outOverhang
  ) {
    float p = clamp(uProgress, 0.0, 1.0);
    if (p <= 0.00005) {
      outLift = 0.0;
      outXi = -10.0;
      outRadius = 0.8;
      outOverhang = 0.0;
      return vec3(posXY, 0.0);
    }

    vec2 uAxis = normalize(uCurlAxis);
    vec2 vAxis = vec2(-uAxis.y, uAxis.x);

    float W = ${PAGE_WIDTH.toFixed(4)};
    float H = ${PAGE_HEIGHT.toFixed(4)};
    float cu = 0.5 * W * abs(uAxis.x) + 0.5 * H * abs(uAxis.y);

    float pu = dot(posXY, uAxis);
    float pv = dot(posXY, vAxis);
    float s = cu - pu;

    float thetaMax = 3.14159265 * sstep(0.0, 0.22, p);

    float liftEnv = sstep(0.0, 0.05, p) * (1.0 - sstep(0.84, 1.0, p));
    float baseR = 0.38 + 0.44 * sin(3.14159265 * min(1.0, p / 0.88));
    float cornerFactor = 4.0 * abs(uAxis.x) * abs(uAxis.y);
    float conicalTaper = 1.0 + 0.14 * cornerFactor * clamp(pv / max(W, H), -0.8, 0.8);
    float R = max(0.0, (baseR * conicalTaper - 0.07 * clamp(uVelocityFlex, -1.0, 1.0)) * liftEnv);

    float foldProg = pow(sstep(0.0, 0.90, p), 1.24);
    float sFold = foldProg * (2.0 * cu + 3.14159265 * R);

    float xi = sFold - s;
    outXi = xi;
    outRadius = max(R, 0.001);
    outOverhang = max(0.0, sFold - 3.14159265 * R);

    float puNew = pu;
    float z = 0.0;

    if (xi > 0.0) {
      float Lcurl = max(R * thetaMax, 0.00005);
      if (xi <= Lcurl && R > 0.00005) {
        float alpha = xi / R;
        puNew = (cu - sFold) + R * sin(alpha);
        z = R * (1.0 - cos(alpha));
      } else {
        float eta = xi - Lcurl;
        float zApex = R * (1.0 - cos(thetaMax));
        float zFloor = 0.015 * (1.0 - sstep(0.84, 1.0, p));
        float kDroop = 0.28;
        float ke = kDroop * eta;
        float droopDecay = 1.0 / (1.0 + ke * ke);
        z = zFloor + (zApex - zFloor) * droopDecay;
        float dzdeta = (zApex - zFloor) * (-2.0 * kDroop * ke) * droopDecay * droopDecay;
        float horizScale = sqrt(max(0.0, 1.0 - min(0.35, dzdeta * dzdeta)));
        puNew = (cu - sFold) + R * sin(thetaMax) + eta * cos(thetaMax) * horizScale;
      }
    }

    float rawExcess = 2.0 * sFold - 3.14159265 * R - 2.0 * cu;
    puNew += max(0.0, rawExcess) * sstep(0.68, 0.97, p);

    outLift = max(0.0, z);
    vec2 finalXY = uAxis * puNew + vAxis * pv;
    return vec3(finalXY, z);
  }
`;

const PAPER_VERTEX_SHADER = /* glsl */ `
  attribute float aLayer;
  attribute float aIsEdge;

  ${PAPER_DEFORM_GLSL}

  void main() {
    vUv = uv;
    vLayer = aLayer;
    vIsEdge = aIsEdge;

    float lift0, xi0, rad0, over0;
    vec3 p0 = evaluatePaperSurface(position.xy, lift0, xi0, rad0, over0);

    float eps = 0.014;
    float d1, d2, d3, d4;
    vec3 px = evaluatePaperSurface(position.xy + vec2(eps, 0.0), d1, d2, d3, d4);
    vec3 py = evaluatePaperSurface(position.xy + vec2(0.0, eps), d1, d2, d3, d4);

    vec3 surfNormal = normalize(cross(px - p0, py - p0));
    vec3 displacedPos = p0 + surfNormal * (aLayer * 0.5 * uPaperThickness);

    if (aIsEdge > 0.5) {
      vNormalLocal = normalize(vec3(normal.xy, 0.15));
    } else {
      vNormalLocal = surfNormal * sign(aLayer);
    }

    vLiftHeight = lift0;
    vFoldSignedDist = xi0;
    vCurlRadius = rad0;
    vOverhangReach = over0;

    vec4 worldPosition = modelMatrix * vec4(displacedPos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const PAPER_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uFrontTex;
  uniform sampler2D uBackTex;
  uniform float uIsBackSideUp;
  uniform float uProgress;
  uniform float uStudioAngleFactor;
  uniform vec3 uLightDir;
  uniform vec3 uCameraPos;

  varying vec2 vUv;
  varying float vLayer;
  varying float vIsEdge;
  varying vec3 vNormalLocal;
  varying vec3 vWorldPos;
  varying float vLiftHeight;
  varying float vFoldSignedDist;
  varying float vCurlRadius;
  varying float vOverhangReach;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float paperFiberField(vec2 uv) {
    vec2 p = uv * vec2(680.0, 960.0);
    float n1 = valueNoise(p * vec2(1.0, 0.45));
    float n2 = valueNoise(p * vec2(0.45, 1.0));
    float n3 = valueNoise(p * 2.4);
    float flock = valueNoise(uv * vec2(160.0, 220.0));
    return (n1 * 0.34 + n2 * 0.34 + n3 * 0.22 + flock * 0.10) - 0.5;
  }

  void main() {
    if (vIsEdge > 0.5) {
      float edgeLight = 0.90 + 0.10 * max(0.0, dot(normalize(vNormalLocal), uLightDir));
      float edgeGrain = paperFiberField(vUv * 2.0) * 0.012;
      vec3 cutPaperColor = vec3(0.972, 0.968, 0.958) * edgeLight + edgeGrain;
      gl_FragColor = vec4(cutPaperColor, 1.0);
      return;
    }

    bool isTopLayer = (vLayer > 0.0);
    bool showPrintedResume = (uIsBackSideUp < 0.5) ? isTopLayer : (!isTopLayer);
    vec2 sampleUv = isTopLayer ? vUv : vec2(1.0 - vUv.x, vUv.y);

    float epsUv = 0.0007;
    float f0 = paperFiberField(sampleUv);
    float fx = paperFiberField(sampleUv + vec2(epsUv, 0.0));
    float fy = paperFiberField(sampleUv + vec2(0.0, epsUv));
    vec3 fiberPerturb = vec3((f0 - fx) * 6.2, (f0 - fy) * 6.2, 0.0);

    vec3 N = normalize(vNormalLocal + fiberPerturb * (0.008 + 0.026 * clamp(vLiftHeight * 1.4 + uStudioAngleFactor, 0.0, 1.0)));
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 H = normalize(L + V);

    float normalTilt = 1.0 - clamp(abs(vNormalLocal.z), 0.0, 1.0);
    float physicalActivity = clamp(vLiftHeight * 1.6 + normalTilt * 1.8 + uStudioAngleFactor * 0.32, 0.0, 1.0);

    float NdotL = dot(N, L);
    float keyLight = clamp(NdotL, 0.0, 1.0);
    float keyNeutral = max(0.001, uLightDir.z);
    float rakingRatio = keyLight / keyNeutral;

    float spec = pow(clamp(dot(N, H), 0.0, 1.0), 28.0) * 0.055 * clamp(normalTilt * 2.2 + uStudioAngleFactor * 0.4, 0.0, 1.0);

    float selfShadow = 1.0;
    if (uProgress > 0.01) {
      float flatSheetMask = 1.0 - smoothstep(0.002, 0.06, vLiftHeight);
      if (flatSheetMask > 0.001 && vOverhangReach > 0.01) {
        float distUnderFlap = -vFoldSignedDist;
        float shadowExtent = vOverhangReach + 0.38 * vCurlRadius;
        float underCurve = smoothstep(-0.18, 0.12, distUnderFlap) * (1.0 - smoothstep(shadowExtent - 0.25, shadowExtent + 0.45, distUnderFlap));
        float shadowStrength = 0.22 * clamp(vOverhangReach * 0.85, 0.0, 1.0) * (1.0 - smoothstep(0.78, 0.98, uProgress));
        selfShadow = 1.0 - shadowStrength * underCurve * flatSheetMask;
      }
      float undersideFactor = smoothstep(-0.7, 0.25, vNormalLocal.z);
      selfShadow *= (0.88 + 0.12 * undersideFactor);
    }

    vec2 edgeDist = min(sampleUv, 1.0 - sampleUv) * vec2(5.96, 8.42);
    float minEdge = min(edgeDist.x, edgeDist.y);
    float edgeBevel = 0.965 + 0.035 * smoothstep(0.0, 0.022, minEdge);

    if (showPrintedResume) {
      vec3 docColor = texture2D(uFrontTex, vUv).rgb;
      float lum = dot(docColor, vec3(0.299, 0.587, 0.114));
      float paperMask = smoothstep(0.75, 0.98, lum);
      float fiberGrain = f0 * (0.004 + 0.008 * physicalActivity) * paperMask;
      float shadeMult = mix(1.0, clamp(0.80 + 0.22 * rakingRatio, 0.74, 1.05) * selfShadow, physicalActivity);
      vec3 finalFront = docColor * shadeMult * edgeBevel + vec3(fiberGrain + spec * paperMask);
      gl_FragColor = vec4(clamp(finalFront, 0.0, 1.0), 1.0);
    } else {
      vec2 backUv = isTopLayer ? vUv : vec2(1.0 - vUv.x, vUv.y);
      vec3 backSurfaceColor = texture2D(uBackTex, backUv).rgb;
      float reverseGrain = f0 * 0.008;

      vec3 frontInkGhost = texture2D(uFrontTex, vUv).rgb;
      float translucencyAmount = 0.028 * clamp(vLiftHeight * 0.95, 0.0, 1.0);
      vec3 translucentBase = mix(backSurfaceColor, frontInkGhost * vec3(0.99, 0.98, 0.96), translucencyAmount);

      float backlightGlow = 0.022 * clamp(vLiftHeight * 0.8, 0.0, 1.0) * max(0.0, -dot(vNormalLocal, L));
      float shadeBack = mix(1.0, clamp(0.80 + 0.21 * rakingRatio, 0.74, 1.05) * selfShadow, physicalActivity);
      vec3 finalBack = (translucentBase + reverseGrain) * shadeBack * edgeBevel + vec3(spec + backlightGlow);
      gl_FragColor = vec4(clamp(finalBack, 0.0, 1.0), 1.0);
    }
  }
`;

// Desk Surface Shader
const DESK_VERTEX_SHADER = /* glsl */ `
  varying vec2 vDeskPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vDeskPos = worldPos.xy;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const DESK_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uProgress;
  uniform vec2 uCurlAxis;
  uniform vec2 uLightProj;

  varying vec2 vDeskPos;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float sstep(float e0, float e1, float x) {
    float t = clamp((x - e0) / max(e1 - e0, 0.0001), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  float boxSDF(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  void main() {
    float radialDist = length(vDeskPos * vec2(0.075, 0.065));
    vec3 centerTone = vec3(0.916, 0.910, 0.898);
    vec3 edgeTone = vec3(0.845, 0.838, 0.824);
    float microGrain = (hash21(vDeskPos * 38.0) - 0.5) * 0.008;
    vec3 deskColor = mix(centerTone, edgeTone, smoothstep(0.15, 1.35, radialDist)) + microGrain;

    float halfW = ${(PAGE_WIDTH * 0.5).toFixed(4)};
    float halfH = ${(PAGE_HEIGHT * 0.5).toFixed(4)};

    float p = clamp(uProgress, 0.0, 1.0);
    vec2 uAxis = normalize(uCurlAxis);
    float cu = halfW * abs(uAxis.x) + halfH * abs(uAxis.y);

    float liftEnv = sstep(0.0, 0.05, p) * (1.0 - sstep(0.84, 1.0, p));
    float R = (0.38 + 0.44 * sin(3.14159265 * min(1.0, p / 0.88))) * liftEnv;
    float foldProg = pow(sstep(0.0, 0.90, p), 1.24);
    float sFold = foldProg * (2.0 * cu + 3.14159265 * R);

    float pu = dot(vDeskPos, uAxis);
    float s = cu - pu;
    float xi = sFold - s;

    float dContact = boxSDF(vDeskPos, vec2(halfW, halfH));
    float unliftedMask = (p < 0.001) ? 1.0 : (1.0 - sstep(-0.02, 0.22 * max(R, 0.15), xi) * liftEnv);
    float contactShadow = (1.0 - smoothstep(-0.015, 0.055, dContact)) * 0.24 * unliftedMask;
    float softAmbientHalo = (1.0 - smoothstep(-0.04, 0.36, dContact)) * 0.11 * unliftedMask;

    float elevatedShadow = 0.0;
    if (p > 0.001) {
      vec2 shiftedPos = vDeskPos - uLightProj * (0.48 * R);
      float puShifted = dot(shiftedPos, uAxis);
      float xiShifted = sFold - (cu - puShifted);
      float curlArchMask = smoothstep(-0.45 * R, 0.15 * R, xiShifted) * (1.0 - smoothstep(0.55 * R, 1.85 * R, xiShifted));
      float dBox = boxSDF(shiftedPos, vec2(halfW, halfH));
      float inPageBounds = 1.0 - smoothstep(-0.06, 0.42, dBox);
      elevatedShadow = curlArchMask * inPageBounds * 0.24 * liftEnv;
    }

    float totalShadow = clamp(contactShadow + softAmbientHalo + elevatedShadow, 0.0, 0.38);
    deskColor *= (1.0 - totalShadow);

    gl_FragColor = vec4(deskColor, 1.0);
  }
`;

/**
 * Builds the 3D paper slab BufferGeometry.
 */
function createPaperSlabGeometry(width, height, segX, segY) {
  const topGeo = new THREE.PlaneGeometry(width, height, segX, segY);
  const botGeo = new THREE.PlaneGeometry(width, height, segX, segY);

  const botIndex = botGeo.index.array;
  for (let i = 0; i < botIndex.length; i += 3) {
    const tmp = botIndex[i + 1];
    botIndex[i + 1] = botIndex[i + 2];
    botIndex[i + 2] = tmp;
  }

  const topCount = topGeo.attributes.position.count;
  const botCount = botGeo.attributes.position.count;

  const perimeterSegments = 2 * (segX + segY);
  const edgeVertCount = perimeterSegments * 4;
  const totalVerts = topCount + botCount + edgeVertCount;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const layers = new Float32Array(totalVerts);
  const isEdge = new Float32Array(totalVerts);

  positions.set(topGeo.attributes.position.array, 0);
  normals.set(topGeo.attributes.normal.array, 0);
  uvs.set(topGeo.attributes.uv.array, 0);
  for (let i = 0; i < topCount; i++) {
    layers[i] = 1.0;
    isEdge[i] = 0.0;
  }

  positions.set(botGeo.attributes.position.array, topCount * 3);
  normals.set(botGeo.attributes.normal.array, topCount * 3);
  uvs.set(botGeo.attributes.uv.array, topCount * 2);
  for (let i = 0; i < botCount; i++) {
    layers[topCount + i] = -1.0;
    isEdge[topCount + i] = 0.0;
  }

  const indices = [];
  for (let i = 0; i < topGeo.index.count; i++) {
    indices.push(topGeo.index.array[i]);
  }
  for (let i = 0; i < botGeo.index.count; i++) {
    indices.push(botGeo.index.array[i] + topCount);
  }

  let vCursor = topCount + botCount;
  function addEdgeSegment(x0, y0, u0, v0, x1, y1, u1, v1, nx, ny) {
    const base = vCursor;
    const coords = [
      [x0, y0, u0, v0, 1.0],
      [x1, y1, u1, v1, 1.0],
      [x0, y0, u0, v0, -1.0],
      [x1, y1, u1, v1, -1.0],
    ];
    for (let k = 0; k < 4; k++) {
      const idx = base + k;
      positions[idx * 3 + 0] = coords[k][0];
      positions[idx * 3 + 1] = coords[k][1];
      positions[idx * 3 + 2] = 0.0;
      normals[idx * 3 + 0] = nx;
      normals[idx * 3 + 1] = ny;
      normals[idx * 3 + 2] = 0.0;
      uvs[idx * 2 + 0] = coords[k][2];
      uvs[idx * 2 + 1] = coords[k][3];
      layers[idx] = coords[k][4];
      isEdge[idx] = 1.0;
    }
    indices.push(base, base + 2, base + 1);
    indices.push(base + 1, base + 2, base + 3);
    vCursor += 4;
  }

  const hw = width * 0.5;
  const hh = height * 0.5;

  for (let ix = 0; ix < segX; ix++) {
    const t0 = ix / segX;
    const t1 = (ix + 1) / segX;
    const x0 = -hw + t0 * width;
    const x1 = -hw + t1 * width;
    addEdgeSegment(x0, -hh, t0, 0.0, x1, -hh, t1, 0.0, 0.0, -1.0);
    addEdgeSegment(x1, hh, t1, 1.0, x0, hh, t0, 1.0, 0.0, 1.0);
  }

  for (let iy = 0; iy < segY; iy++) {
    const t0 = iy / segY;
    const t1 = (iy + 1) / segY;
    const y0 = -hh + t0 * height;
    const y1 = -hh + t1 * height;
    addEdgeSegment(hw, y0, 1.0, t0, hw, y1, 1.0, t1, 1.0, 0.0);
    addEdgeSegment(-hw, y1, 0.0, t1, -hw, y0, 0.0, t0, -1.0, 0.0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('aLayer', new THREE.BufferAttribute(layers, 1));
  geo.setAttribute('aIsEdge', new THREE.BufferAttribute(isEdge, 1));
  geo.setIndex(indices);
  return geo;
}

function shortestAngleDelta(fromAngle, toAngle) {
  return Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle));
}

class InteractivePaperResumeApp {
  constructor() {
    this.canvas = document.getElementById('paper-canvas');
    this.stageContainer = document.getElementById('stage-container');
    this.linkTooltip = document.getElementById('link-tooltip');
    this.statusAnnouncement = document.getElementById('sr-status');
    this.sideBadge = document.getElementById('sheet-side-badge');
    this.statusDot = document.getElementById('status-dot');
    this.interactionHint = document.getElementById('interaction-hint');
    this.turnIntimation = document.getElementById('turn-intimation');
    this.soundEngine = new PaperSoundEngine();

    // Sound is ON by default
    this.soundEngine.setMuted(false);

    // Page State
    this.isBackSideUp = false;
    this.progress = 0.0;
    this.targetProgress = 0.0;
    this.velocityProgress = 0.0;

    // 360-degree curl direction
    this.curlAngle = -0.58;
    this.targetCurlAngle = -0.58;
    this.curlAngleVelocity = 0.0;

    this.isFoldPinned = false;
    this.hasTurnedOnce = false;
    this.isBeckoning = false;

    // 3D Personality Stickers State
    this.stickyNotes = [];
    this.hoveredStickyNote = null;
    this.lastBackCompositeState = '';

    // Interaction & Gesture State
    this.isDragging = false;
    this.isPanning = false;
    this.isPinching = false;
    this.isAutoTurning = false;
    this.spaceKeyDown = false;

    this.dragStartTime = 0;
    this.dragStartWorld = new THREE.Vector2();
    this.dragAnchorWorld = new THREE.Vector2(PAGE_WIDTH * 0.5, -PAGE_HEIGHT * 0.5);
    this.dragSpanDistance = PAGE_WIDTH;

    this.panStartClient = new THREE.Vector2();
    this.panStartOffset = new THREE.Vector2();

    this.activePointers = new Map();
    this.prevPinchDist = 0;
    this.prevPinchMid = new THREE.Vector2();
    this.lastTapTime = 0;
    this.lastTapClient = new THREE.Vector2();

    this.hoveredLink = null;
    this.hoveredZone = null;

    // Permanent Calibrated 3D View State (Perfect for viewing & 3D depth)
    this.studioAngleBlend = 0.42;
    this.zoomLevel = 1.0;
    this.targetZoomLevel = 1.0;
    this.panOffset = new THREE.Vector2(0, 0);
    this.targetPanOffset = new THREE.Vector2(0, 0);

    this._initThree();
    this._buildScene();
    this._bindEvents();
    this._onResize();
    this._scheduleTurnIntimation();

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this._animate(t));
  }

  /**
   * Schedules the 2.4-second side intimation & subtle corner beckon after landing.
   */
  _scheduleTurnIntimation() {
    setTimeout(() => {
      if (this.hasTurnedOnce || this.isBackSideUp) return;
      showElement(this.turnIntimation);
      // Perform a gentle 3D corner beckon on the bottom-right corner so the user sees the colorful back
      if (!this.isDragging && !this.isAutoTurning && this.progress < 0.02) {
        this.isBeckoning = true;
        this.curlAngle = -0.56;
        this.targetCurlAngle = -0.56;
        this.targetProgress = 0.068;
      }
    }, 2400);
  }

  _initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe6e4e0);

    this.camera = new THREE.PerspectiveCamera(26, 1, 0.5, 80);
    this.raycaster = new THREE.Raycaster();
    this.deskPlaneMath = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  }

  _buildScene() {
    const maxTexSize = this.renderer.capabilities.maxTextureSize || 4096;
    const texUrl = maxTexSize >= 5052 ? './assets/resume-4k.png' : './assets/resume-4096.png';

    const loader = new THREE.TextureLoader();
    this.frontTexture = loader.load(texUrl, (tex) => {
      tex.colorSpace = THREE.NoColorSpace;
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
    });

    this.lightDir = new THREE.Vector3(-0.34, 0.44, 0.83).normalize();
    this.lightProj = new THREE.Vector2(
      -this.lightDir.x / this.lightDir.z,
      -this.lightDir.y / this.lightDir.z
    );

    // Build 3D Die-Cut Personality Sticker Meshes on the back of the resume
    this.stickyNotesGroup = new THREE.Group();
    this.scene.add(this.stickyNotesGroup);

    const noteGeo = new THREE.PlaneGeometry(NOTE_WIDTH, NOTE_HEIGHT, 28, 28);

    STICKY_NOTES_DATA.forEach((data, idx) => {
      const { texture: stickerTexture, canvas: stickerCanvas } = createSingleStickerTexture(
        data,
        this.renderer
      );
      const home = getNoteHomePosition(data);

      const noteUniforms = {
        uNoteTex: { value: stickerTexture },
        uHoverLift: { value: 0.0 },
        uPeelLift: { value: 0.0 },
        uIsShadowPass: { value: 0.0 },
        uLightOffset: { value: this.lightProj },
        uLightDir: { value: this.lightDir },
      };

      const shadowUniforms = {
        uNoteTex: { value: stickerTexture },
        uHoverLift: { value: 0.0 },
        uPeelLift: { value: 0.0 },
        uIsShadowPass: { value: 1.0 },
        uLightOffset: { value: this.lightProj },
        uLightDir: { value: this.lightDir },
      };

      const noteMat = new THREE.ShaderMaterial({
        vertexShader: STICKY_VERTEX_SHADER,
        fragmentShader: STICKY_FRAGMENT_SHADER,
        uniforms: noteUniforms,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.06,
      });

      const shadowMat = new THREE.ShaderMaterial({
        vertexShader: STICKY_VERTEX_SHADER,
        fragmentShader: STICKY_FRAGMENT_SHADER,
        uniforms: shadowUniforms,
        transparent: true,
        depthWrite: false,
      });

      const group = new THREE.Group();
      const shadowMesh = new THREE.Mesh(noteGeo, shadowMat);
      const noteMesh = new THREE.Mesh(noteGeo, noteMat);
      shadowMesh.renderOrder = 2 + idx * 2;
      noteMesh.renderOrder = 3 + idx * 2;

      group.add(shadowMesh);
      group.add(noteMesh);
      group.position.set(home.x, home.y, PAPER_THICKNESS * 0.65 + idx * 0.0015);
      group.rotation.z = home.rotZ;

      this.stickyNotesGroup.add(group);

      const noteObj = {
        index: idx,
        data,
        group,
        noteMesh,
        shadowMesh,
        noteUniforms,
        shadowUniforms,
        stickerTexture,
        stickerCanvas,
        pos: new THREE.Vector2(home.x, home.y),
        rotZ: home.rotZ,
        hoverVal: 0.0,
        targetHoverVal: 0.0,
        peelVal: 0.0,
        targetPeelVal: 0.0,
        zOrder: idx,
      };
      noteMesh.userData.stickyNote = noteObj;
      this.stickyNotes.push(noteObj);
    });

    // Build dynamic Back-of-Resume composite canvas texture (for seamless 3D curling of attached stickers)
    this.backCanvas = document.createElement('canvas');
    this.backCanvas.width = 2048;
    this.backCanvas.height = 2896;
    this.backTexture = new THREE.CanvasTexture(this.backCanvas);
    this.backTexture.colorSpace = THREE.NoColorSpace;
    this.backTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.backTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.backTexture.magFilter = THREE.LinearFilter;
    this.backTexture.generateMipmaps = true;
    this._refreshBackCompositeTexture(true);

    this.paperUniforms = {
      uFrontTex: { value: this.frontTexture },
      uBackTex: { value: this.backTexture },
      uIsBackSideUp: { value: 0.0 },
      uProgress: { value: 0.0 },
      uCurlAxis: { value: new THREE.Vector2(Math.cos(this.curlAngle), Math.sin(this.curlAngle)) },
      uVelocityFlex: { value: 0.0 },
      uPaperThickness: { value: PAPER_THICKNESS },
      uStudioAngleFactor: { value: this.studioAngleBlend },
      uLightDir: { value: this.lightDir },
      uCameraPos: { value: new THREE.Vector3(0, 0, 19) },
    };

    const paperGeo = createPaperSlabGeometry(PAGE_WIDTH, PAGE_HEIGHT, SEGMENTS_X, SEGMENTS_Y);
    this.paperMaterial = new THREE.ShaderMaterial({
      vertexShader: PAPER_VERTEX_SHADER,
      fragmentShader: PAPER_FRAGMENT_SHADER,
      uniforms: this.paperUniforms,
      side: THREE.DoubleSide,
    });

    this.paperMesh = new THREE.Mesh(paperGeo, this.paperMaterial);
    this.paperMesh.frustumCulled = false;
    this.scene.add(this.paperMesh);

    this.deskUniforms = {
      uProgress: { value: 0.0 },
      uCurlAxis: { value: new THREE.Vector2(Math.cos(this.curlAngle), Math.sin(this.curlAngle)) },
      uLightProj: { value: this.lightProj },
    };

    const deskGeo = new THREE.PlaneGeometry(36, 36, 1, 1);
    const deskMat = new THREE.ShaderMaterial({
      vertexShader: DESK_VERTEX_SHADER,
      fragmentShader: DESK_FRAGMENT_SHADER,
      uniforms: this.deskUniforms,
    });
    this.deskMesh = new THREE.Mesh(deskGeo, deskMat);
    this.deskMesh.position.z = -PAPER_THICKNESS * 0.65;
    this.scene.add(this.deskMesh);

    const hitGeo = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.scene.add(this.hitMesh);
  }

  _refreshBackCompositeTexture(showAttachedInTexture) {
    const stateKey = showAttachedInTexture ? 'curl' : 'flat';
    if (this.lastBackCompositeState === stateKey) return;
    this.lastBackCompositeState = stateKey;
    updateBackSheetCompositeTexture(
      this.backCanvas,
      this.stickyNotes,
      showAttachedInTexture,
      this.backTexture
    );
  }

  _clientToWorldXY(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.deskPlaneMath, target);
    return { world: target, ndc: new THREE.Vector2(ndcX, ndcY) };
  }

  _clampPanOffset(panVec, zoom = this.targetZoomLevel) {
    const maxPanX = Math.max(0.5, PAGE_WIDTH * 0.56 * (1.0 - 0.52 / Math.max(1.0, zoom)));
    const maxPanY = Math.max(0.5, PAGE_HEIGHT * 0.56 * (1.0 - 0.52 / Math.max(1.0, zoom)));
    panVec.x = Math.max(-maxPanX, Math.min(maxPanX, panVec.x));
    panVec.y = Math.max(-maxPanY, Math.min(maxPanY, panVec.y));
  }

  _zoomAtScreenPoint(clientX, clientY, newZoom) {
    const clampedZoom = Math.max(0.85, Math.min(3.4, newZoom));
    const prevZoom = this.targetZoomLevel;
    if (Math.abs(clampedZoom - prevZoom) < 0.0005) return;

    const beforeWorld = this._clientToWorldXY(clientX, clientY).world;
    const zoomRatio = 1.0 - prevZoom / clampedZoom;

    this.targetZoomLevel = clampedZoom;
    if (clampedZoom <= 1.02) {
      this.targetPanOffset.set(0, 0);
    } else {
      this.targetPanOffset.x += (beforeWorld.x - this.panOffset.x) * zoomRatio;
      this.targetPanOffset.y += (beforeWorld.y - this.panOffset.y) * zoomRatio;
      this._clampPanOffset(this.targetPanOffset, clampedZoom);
    }
  }

  /**
   * Raycasts against the 6 3D Personality Stickers on the back of the resume.
   */
  _pickStickyNote(ndc) {
    if (!this.isBackSideUp || this.progress > 0.05) return null;

    const visibleMeshes = [];
    for (const item of this.stickyNotes) {
      if (item.group.visible) {
        visibleMeshes.push(item.noteMesh);
      }
    }
    if (!visibleMeshes.length) return null;

    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(visibleMeshes, false);
    if (!hits.length) return null;

    return hits[0].object.userData.stickyNote || null;
  }

  /**
   * Detects if a world XY coordinate is near any of the 4 corners or any of the 4 sides.
   */
  _detectPerimeterPeelZone(worldX, worldY, isTouch = false) {
    const hw = PAGE_WIDTH * 0.5;
    const hh = PAGE_HEIGHT * 0.5;
    const outerReach = isTouch ? 1.45 : 1.15;

    if (Math.abs(worldX) > hw + outerReach || Math.abs(worldY) > hh + outerReach) {
      return null;
    }

    const cornerRadius = isTouch ? 1.95 : 1.65;
    const corners = [
      { name: 'bottom-right', anchorX: hw, anchorY: -hh, defaultAngle: -0.62, span: Math.hypot(PAGE_WIDTH, PAGE_HEIGHT) * 0.86 },
      { name: 'top-right', anchorX: hw, anchorY: hh, defaultAngle: 0.62, span: Math.hypot(PAGE_WIDTH, PAGE_HEIGHT) * 0.86 },
      { name: 'bottom-left', anchorX: -hw, anchorY: -hh, defaultAngle: -Math.PI + 0.62, span: Math.hypot(PAGE_WIDTH, PAGE_HEIGHT) * 0.86 },
      { name: 'top-left', anchorX: -hw, anchorY: hh, defaultAngle: Math.PI - 0.62, span: Math.hypot(PAGE_WIDTH, PAGE_HEIGHT) * 0.86 },
    ];

    let bestCorner = null;
    let bestCornerDist = Infinity;
    for (const c of corners) {
      const d = Math.hypot(worldX - c.anchorX, worldY - c.anchorY);
      if (d < bestCornerDist) {
        bestCornerDist = d;
        bestCorner = c;
      }
    }

    if (bestCornerDist <= cornerRadius) {
      return {
        ...bestCorner,
        isCorner: true,
        dist: bestCornerDist,
      };
    }

    const edgeBandX = isTouch ? hw * 0.36 : hw * 0.28;
    const edgeBandY = isTouch ? hh * 0.28 : hh * 0.22;

    const distRight = Math.abs(hw - worldX);
    const distLeft = Math.abs(-hw - worldX);
    const distTop = Math.abs(hh - worldY);
    const distBottom = Math.abs(-hh - worldY);

    const minEdgeDist = Math.min(distRight, distLeft, distTop, distBottom);

    if (minEdgeDist === distRight && distRight <= edgeBandX && Math.abs(worldY) <= hh) {
      return {
        name: 'right-edge',
        anchorX: hw,
        anchorY: worldY * 0.35,
        defaultAngle: (worldY / hh) * 0.22,
        span: PAGE_WIDTH * 1.04,
        isCorner: false,
        dist: distRight,
      };
    }

    if (minEdgeDist === distLeft && distLeft <= edgeBandX && Math.abs(worldY) <= hh) {
      const offsetAngle = -(worldY / hh) * 0.22;
      return {
        name: 'left-edge',
        anchorX: -hw,
        anchorY: worldY * 0.35,
        defaultAngle: Math.PI + offsetAngle,
        span: PAGE_WIDTH * 1.04,
        isCorner: false,
        dist: distLeft,
      };
    }

    if (minEdgeDist === distTop && distTop <= edgeBandY && Math.abs(worldX) <= hw) {
      return {
        name: 'top-edge',
        anchorX: worldX * 0.35,
        anchorY: hh,
        defaultAngle: Math.PI * 0.5 - (worldX / hw) * 0.22,
        span: PAGE_HEIGHT * 0.98,
        isCorner: false,
        dist: distTop,
      };
    }

    if (minEdgeDist === distBottom && distBottom <= edgeBandY && Math.abs(worldX) <= hw) {
      return {
        name: 'bottom-edge',
        anchorX: worldX * 0.35,
        anchorY: -hh,
        defaultAngle: -Math.PI * 0.5 + (worldX / hw) * 0.22,
        span: PAGE_HEIGHT * 0.98,
        isCorner: false,
        dist: distBottom,
      };
    }

    return null;
  }

  _checkHeaderLinkHit(ndc, clientX, clientY) {
    if (this.isBackSideUp || this.progress > 0.08 || this.isDragging || this.isPanning || this.isPinching) {
      return null;
    }

    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.hitMesh, false);
    if (!hits.length || !hits[0].uv) {
      return null;
    }

    const { x: u, y: v } = hits[0].uv;
    for (const link of PDF_LINKS) {
      if (u >= link.uMin && u <= link.uMax && v >= link.vMin && v <= link.vMax) {
        this._showLinkTooltip(link.label, clientX, clientY);
        return link;
      }
    }

    return null;
  }

  _showLinkTooltip(text, clientX, clientY) {
    if (!this.linkTooltip) return;
    this.linkTooltip.textContent = text;
    this.linkTooltip.hidden = false;
    this.linkTooltip.style.transform = `translate3d(${Math.round(clientX + 14)}px, ${Math.round(clientY - 34)}px, 0)`;
  }

  _hideLinkTooltip() {
    if (this.linkTooltip && !this.linkTooltip.hidden) {
      this.linkTooltip.hidden = true;
    }
  }

  _bindEvents() {
    // Unlock Web Audio automatically in capture phase on the very first user gesture anywhere in the window
    const unlockAudio = () => {
      this.soundEngine.ensureContext();
    };
    window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
    window.addEventListener('mousedown', unlockAudio, { capture: true, passive: true });
    window.addEventListener('click', unlockAudio, { capture: true, passive: true });
    window.addEventListener('wheel', unlockAudio, { capture: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { capture: true, passive: true });

    // 1. Pointer Down (Mouse & Multi-Touch)
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
      this.soundEngine.ensureContext();
      this.isBeckoning = false;

      this.activePointers.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
      });

      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (_) {}

      // Two-finger touch on mobile -> Enter Pinch-Zoom + Two-Finger Pan mode immediately
      if (this.activePointers.size === 2) {
        this.isDragging = false;
        this.isPanning = false;
        this.isPinching = true;
        this._hideLinkTooltip();

        const pts = Array.from(this.activePointers.values());
        this.prevPinchDist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY);
        this.prevPinchMid.set(
          (pts[0].clientX + pts[1].clientX) * 0.5,
          (pts[0].clientY + pts[1].clientY) * 0.5
        );
        return;
      }

      if (this.activePointers.size > 2) return;

      const isTouch = e.pointerType === 'touch';
      const now = performance.now();
      const { world, ndc } = this._clientToWorldXY(e.clientX, e.clientY);

      // Double-tap / double-click detection on interior of sheet for quick zoom toggle
      const tapDist = Math.hypot(e.clientX - this.lastTapClient.x, e.clientY - this.lastTapClient.y);
      const zone = this._detectPerimeterPeelZone(world.x, world.y, isTouch);

      if (now - this.lastTapTime < 280 && tapDist < 28 && !zone) {
        const nextZoom = this.targetZoomLevel > 1.25 ? 1.0 : 2.0;
        this._zoomAtScreenPoint(e.clientX, e.clientY, nextZoom);
        this.lastTapTime = 0;
        return;
      }
      this.lastTapTime = now;
      this.lastTapClient.set(e.clientX, e.clientY);

      // Middle click, Space+drag, or dragging the interior when zoomed in -> 2D Pan
      if (
        e.button === 1 ||
        this.spaceKeyDown ||
        (!zone && this.targetZoomLevel > 1.03 && !this.isFoldPinned)
      ) {
        this.isPanning = true;
        this.isDragging = false;
        this.panStartClient.set(e.clientX, e.clientY);
        this.panStartOffset.copy(this.targetPanOffset);
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      // Check header links when flat on front
      const link = this._checkHeaderLinkHit(ndc, e.clientX, e.clientY);
      if (link) {
        this.hoveredLink = link;
        return;
      }

      // Determine active peel zone (all 4 corners + all 4 sides)
      let activeZone = zone;
      if (!activeZone) {
        const hw = PAGE_WIDTH * 0.5;
        const hh = PAGE_HEIGHT * 0.5;
        const angleToPoint = Math.atan2(world.y / hh, world.x / hw);
        activeZone = {
          name: 'custom-perimeter',
          anchorX: Math.cos(angleToPoint) * hw,
          anchorY: Math.sin(angleToPoint) * hh,
          defaultAngle: Math.atan2(world.y, world.x),
          span: Math.hypot(PAGE_WIDTH, PAGE_HEIGHT) * 0.82,
          isCorner: false,
        };
      }

      this.hoveredZone = activeZone;
      this.isDragging = true;
      this.isAutoTurning = false;
      this.dragStartTime = now;
      this.dragStartWorld.set(world.x, world.y);
      this.dragAnchorWorld.set(activeZone.anchorX, activeZone.anchorY);
      this.dragSpanDistance = activeZone.span || PAGE_WIDTH;

      if (this.progress < 0.08) {
        this.curlAngle = activeZone.defaultAngle;
        this.targetCurlAngle = activeZone.defaultAngle;
        this.targetProgress = 0.085;
        this.soundEngine.triggerLift(0.75, Math.cos(this.curlAngle) * 0.65);
      } else {
        this.targetCurlAngle = activeZone.defaultAngle;
      }

      this.canvas.style.cursor = 'grabbing';
    });

    // 2. Pointer Move
    window.addEventListener('pointermove', (e) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType: e.pointerType,
        });
      }

      // Two-Finger Pinch Zoom + Two-Finger Pan on Mobile
      if (this.isPinching && this.activePointers.size >= 2) {
        const pts = Array.from(this.activePointers.values());
        const newDist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY);
        const newMidX = (pts[0].clientX + pts[1].clientX) * 0.5;
        const newMidY = (pts[0].clientY + pts[1].clientY) * 0.5;

        if (this.prevPinchDist > 10) {
          const scale = newDist / this.prevPinchDist;
          this._zoomAtScreenPoint(newMidX, newMidY, this.targetZoomLevel * scale);
        }

        const prevWorld = this._clientToWorldXY(this.prevPinchMid.x, this.prevPinchMid.y).world;
        const currWorld = this._clientToWorldXY(newMidX, newMidY).world;
        this.targetPanOffset.x -= currWorld.x - prevWorld.x;
        this.targetPanOffset.y -= currWorld.y - prevWorld.y;
        this._clampPanOffset(this.targetPanOffset);

        this.prevPinchDist = newDist;
        this.prevPinchMid.set(newMidX, newMidY);
        return;
      }

      // 1-Finger / Mouse Pan when zoomed in
      if (this.isPanning) {
        const startWorld = this._clientToWorldXY(this.panStartClient.x, this.panStartClient.y).world;
        const currWorld = this._clientToWorldXY(e.clientX, e.clientY).world;
        this.targetPanOffset.x = this.panStartOffset.x - (currWorld.x - startWorld.x);
        this.targetPanOffset.y = this.panStartOffset.y - (currWorld.y - startWorld.y);
        this._clampPanOffset(this.targetPanOffset);
        return;
      }

      const { world, ndc } = this._clientToWorldXY(e.clientX, e.clientY);

      // Omni-Directional 360-Degree Paper Peel Drag
      if (this.isDragging) {
        this._hideLinkTooltip();
        const vecX = this.dragAnchorWorld.x - world.x;
        const vecY = this.dragAnchorWorld.y - world.y;
        const pullDist = Math.hypot(vecX, vecY);

        if (pullDist > 0.18) {
          const pointerAngle = Math.atan2(vecY, vecX);
          const blend = Math.min(1.0, (pullDist - 0.18) / 0.95);
          const defaultAngle = this.hoveredZone ? this.hoveredZone.defaultAngle : this.targetCurlAngle;
          const delta = shortestAngleDelta(defaultAngle, pointerAngle);
          this.targetCurlAngle = defaultAngle + delta * blend;
        }

        const axisX = Math.cos(this.targetCurlAngle);
        const axisY = Math.sin(this.targetCurlAngle);
        const projectedPull = Math.max(0.0, vecX * axisX + vecY * axisY);

        const rawProg = projectedPull / Math.max(4.2, this.dragSpanDistance);
        this.targetProgress = Math.max(0.035, Math.min(0.95, rawProg));
        return;
      }

      if (this.isAutoTurning || e.pointerType === 'touch') return;

      // Check 3D Personality Sticker Hover when viewing the back of the resume
      const hitNote = this._pickStickyNote(ndc);
      if (this.hoveredStickyNote && this.hoveredStickyNote !== hitNote) {
        this.hoveredStickyNote.targetHoverVal = 0.0;
      }
      this.hoveredStickyNote = hitNote;

      if (hitNote) {
        if (hitNote.targetHoverVal < 0.5) {
          hitNote.targetHoverVal = 1.0;
          this.soundEngine.triggerStickyHover(Math.max(-0.8, Math.min(0.8, hitNote.pos.x / 4.5)));
        }
      }

      // Check header links when flat on front
      const link = this._checkHeaderLinkHit(ndc, e.clientX, e.clientY);
      this.hoveredLink = link;
      if (link) {
        this.canvas.style.cursor = 'pointer';
        if (!this.isFoldPinned && !this.isBeckoning) this.targetProgress = 0.0;
        return;
      }

      this._hideLinkTooltip();

      // Check perimeter peel hover along all 4 corners and all 4 edges
      const zone = this._detectPerimeterPeelZone(world.x, world.y, false);
      if (zone && !this.isFoldPinned) {
        this.isBeckoning = false;
        this.canvas.style.cursor = 'grab';
        const maxHoverDist = zone.isCorner ? 1.65 : 1.05;
        if (zone.dist < maxHoverDist) {
          const proximity = 1.0 - zone.dist / maxHoverDist;
          if (this.progress < 0.020) {
            this.curlAngle = zone.defaultAngle;
            this.soundEngine.triggerCornerBeckon(Math.cos(zone.defaultAngle) * 0.55);
          }
          this.targetCurlAngle = zone.defaultAngle;
          this.targetProgress = 0.018 + (zone.isCorner ? 0.038 : 0.025) * proximity;
        } else {
          this.targetProgress = 0.0;
        }
      } else {
        this.canvas.style.cursor = hitNote ? 'pointer' : this.targetZoomLevel > 1.03 ? 'grab' : 'default';
        if (!this.isFoldPinned && !this.isBeckoning) {
          this.targetProgress = 0.0;
        }
      }
    });

    // 3. Pointer Up / Cancel
    const handlePointerEnd = (e) => {
      this.activePointers.delete(e.pointerId);

      if (this.isPinching) {
        if (this.activePointers.size < 2) {
          this.isPinching = false;
          this.prevPinchDist = 0;
        }
        return;
      }

      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = this.targetZoomLevel > 1.03 ? 'grab' : 'default';
        return;
      }

      if (this.hoveredLink && !this.isDragging) {
        window.open(this.hoveredLink.href, '_blank', 'noopener,noreferrer');
        this.hoveredLink = null;
        return;
      }

      if (!this.isDragging) return;
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';

      const { world, ndc } = this._clientToWorldXY(e.clientX, e.clientY);
      const dragDuration = performance.now() - this.dragStartTime;
      const dragDistance = world.distanceTo(this.dragStartWorld);
      const panStereo = Math.cos(this.curlAngle) * 0.65;

      const isQuickTap = dragDuration < 260 && dragDistance < 0.28;

      // Quick tap on a corner triggers a full 180-degree sheet turn
      if (isQuickTap && this.hoveredZone && this.hoveredZone.isCorner) {
        this.triggerFullTurn(this.curlAngle, false);
        return;
      }

      // Quick tap on a personality sticker on the back zooms in to read it comfortably (or zooms back out)
      if (isQuickTap && this.isBackSideUp) {
        const tappedNote = this._pickStickyNote(ndc);
        if (tappedNote) {
          this.targetProgress = 0.0;
          if (this.targetZoomLevel > 1.4) {
            this.targetZoomLevel = 1.0;
            this.targetPanOffset.set(0, 0);
          } else {
            this.targetZoomLevel = 1.75;
            this.targetPanOffset.set(tappedNote.pos.x, tappedNote.pos.y);
            this._clampPanOffset(this.targetPanOffset, 1.75);
          }
          this.soundEngine.triggerStickyStick(Math.max(-0.7, Math.min(0.7, tappedNote.pos.x / 3.0)));
          return;
        }
      }

      const shouldCompleteTurn =
        this.progress > 0.42 ||
        (this.progress > 0.18 && this.velocityProgress > 0.82);

      if (shouldCompleteTurn) {
        this.isFoldPinned = false;
        this.triggerFullTurn(this.curlAngle, false);
      } else {
        this.isFoldPinned = false;
        this.isAutoTurning = false;
        this.targetProgress = 0.0;
        this._updateSideBadge();
        this.soundEngine.triggerRelease(Math.max(0.18, this.progress * 1.8), 0.32, panStereo);
      }
    };

    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    // 4. Laptop Trackpad Pinch-to-Zoom, Two-Finger Pan & Mouse Wheel Zoom
    const isEmbedded =
      new URLSearchParams(window.location.search).has('embed') || window.self !== window.top;

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        const isTrackpadPinch = e.ctrlKey || e.metaKey;
        // When embedded inside a portfolio iframe, allow normal 1-finger/2-finger vertical page scroll
        // unless the user is pinching (ctrl/cmd+wheel) or already zoomed into the 3D resume.
        if (isEmbedded && !isTrackpadPinch && this.targetZoomLevel <= 1.03) {
          return;
        }

        e.preventDefault();
        this.soundEngine.ensureContext();

        const isDiscreteWheel = Math.abs(e.deltaX) === 0 && Math.abs(e.deltaY) >= 40;

        if (isTrackpadPinch || (isDiscreteWheel && this.targetZoomLevel <= 1.03)) {
          const zoomFactor = isTrackpadPinch
            ? Math.exp(-e.deltaY * 0.012)
            : Math.exp(-Math.sign(e.deltaY) * 0.12);
          this._zoomAtScreenPoint(e.clientX, e.clientY, this.targetZoomLevel * zoomFactor);
        } else if (this.targetZoomLevel > 1.02) {
          const panScale = 0.0042 / Math.max(0.85, this.zoomLevel * 0.65);
          this.targetPanOffset.x += e.deltaX * panScale;
          this.targetPanOffset.y -= e.deltaY * panScale;
          this._clampPanOffset(this.targetPanOffset);
        } else {
          const zoomFactor = Math.exp(-e.deltaY * 0.0035);
          this._zoomAtScreenPoint(e.clientX, e.clientY, this.targetZoomLevel * zoomFactor);
        }
      },
      { passive: false }
    );

    let gestureStartZoom = 1.0;
    this.canvas.addEventListener('gesturestart', (e) => {
      e.preventDefault();
      gestureStartZoom = this.targetZoomLevel;
    });
    this.canvas.addEventListener('gesturechange', (e) => {
      e.preventDefault();
      if (typeof e.scale === 'number') {
        this._zoomAtScreenPoint(
          e.clientX || window.innerWidth * 0.5,
          e.clientY || window.innerHeight * 0.5,
          gestureStartZoom * e.scale
        );
      }
    });

    window.addEventListener('resize', () => this._onResize());

    // 5. Bottom Bar & Side Intimation Controls
    const btnTurn = document.getElementById('btn-turn-page');
    const btnIntimationFlip = document.getElementById('btn-intimation-flip');

    if (btnTurn) {
      btnTurn.addEventListener('click', () => {
        this.soundEngine.ensureContext();
        this.isFoldPinned = false;
        this.isBeckoning = false;
        const angle = this.isBackSideUp ? Math.PI - 0.35 : -0.38;
        this.triggerFullTurn(angle, true);
      });
    }

    if (btnIntimationFlip) {
      btnIntimationFlip.addEventListener('click', () => {
        this.soundEngine.ensureContext();
        this.isFoldPinned = false;
        this.isBeckoning = false;
        hideElement(this.turnIntimation);
        const angle = this.isBackSideUp ? Math.PI - 0.35 : -0.38;
        this.triggerFullTurn(angle, true);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space') {
        this.spaceKeyDown = true;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.soundEngine.ensureContext();
        this.triggerFullTurn(Math.PI - 0.32, true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.soundEngine.ensureContext();
        this.triggerFullTurn(-0.32, true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.soundEngine.ensureContext();
        this.triggerFullTurn(Math.PI * 0.5, true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.soundEngine.ensureContext();
        this.triggerFullTurn(-Math.PI * 0.5, true);
      } else if (e.key === 'Escape') {
        this.targetZoomLevel = 1.0;
        this.targetPanOffset.set(0, 0);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceKeyDown = false;
      }
    });
  }

  /**
   * Triggers a complete, physics-driven 180-degree page turn along any angle.
   */
  triggerFullTurn(angle = -0.42, fromFlat = false) {
    this.isDragging = false;
    this.isFoldPinned = false;
    this.isBeckoning = false;
    this.isAutoTurning = true;
    this.hasTurnedOnce = true;

    hideElement(this.turnIntimation);

    if (fromFlat && this.progress < 0.05) {
      this.curlAngle = angle;
      this.targetCurlAngle = angle;
      this.soundEngine.triggerLift(0.75, Math.cos(angle) * 0.65);
    } else {
      this.targetCurlAngle = angle;
    }

    this.targetProgress = 1.0;
    const remaining = Math.max(0.25, 1.0 - this.progress);
    this.soundEngine.triggerRelease(0.85, remaining * 0.55, Math.cos(angle) * 0.5);
  }

  _updateSideBadge() {
    const btnTurn = document.getElementById('btn-turn-page');
    if (btnTurn) {
      const turnLabel = btnTurn.querySelector('.btn-label');
      if (turnLabel) {
        turnLabel.textContent = this.isBackSideUp
          ? 'Turn Over · Formal CV'
          : 'Turn Over · Human Side';
      }
    }

    if (this.statusDot) {
      this.statusDot.dataset.mode = this.isBackSideUp ? 'back' : 'front';
    }

    if (this.interactionHint) {
      this.interactionHint.textContent = this.isBackSideUp
        ? 'Click any sticker to zoom · Peel any corner to flip back'
        : 'Peel any corner or edge to flip · Scroll or pinch to zoom';
    }

    if (!this.sideBadge) return;
    if (this.isBackSideUp) {
      this.sideBadge.textContent = 'Back · The Human Side of Sauveer';
      this.sideBadge.dataset.side = 'back';
    } else {
      this.sideBadge.textContent = 'Front · Original Resume';
      this.sideBadge.dataset.side = 'front';
    }
  }

  _announce(msg) {
    if (!this.statusAnnouncement) return;
    this.statusAnnouncement.textContent = msg;
  }

  _onResize() {
    const width = this.stageContainer.clientWidth || window.innerWidth;
    const height = this.stageContainer.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const padFactor = width < 640 ? 1.12 : 1.18;
    const distForHeight = (PAGE_HEIGHT * padFactor * 0.5) / Math.tan(vFovRad * 0.5);
    const distForWidth =
      (PAGE_WIDTH * padFactor * 0.5) / (Math.tan(vFovRad * 0.5) * this.camera.aspect);

    this.baseCameraDist = Math.max(distForHeight, distForWidth);
  }

  _animate(now) {
    requestAnimationFrame((t) => this._animate(t));

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) * 0.001));
    this.lastFrameTime = now;

    const prevProgress = this.progress;

    // 1. Shortest-arc angular spring-damper for 360-degree curl direction
    const angleDelta = shortestAngleDelta(this.curlAngle, this.targetCurlAngle);
    const angleStiffness = this.isDragging ? 22.0 : 14.0;
    const angleDamping = 0.80;
    this.curlAngleVelocity =
      (this.curlAngleVelocity + angleDelta * angleStiffness * dt) * Math.pow(angleDamping, dt * 60.0);
    this.curlAngle += this.curlAngleVelocity * dt;

    // 2. Progress spring-damper + gravity settling solver
    if (this.isDragging) {
      const stiffness = 21.0;
      const diff = this.targetProgress - this.progress;
      this.velocityProgress = diff * stiffness;
      this.progress += this.velocityProgress * dt;
    } else if (this.isAutoTurning) {
      const remaining = 1.0 - this.progress;
      const gravityAccel = 1.68 + 2.35 * Math.sin(Math.PI * Math.min(1.0, this.progress));
      const airCushion = Math.max(0.22, Math.min(1.0, remaining * 3.8));
      const stepRate = gravityAccel * airCushion;
      this.velocityProgress = stepRate;
      this.progress += stepRate * dt;

      const nearestCardinal = Math.round(this.curlAngle / (Math.PI * 0.5)) * (Math.PI * 0.5);
      this.targetCurlAngle = nearestCardinal;

      if (this.progress >= 0.9985) {
        this.progress = 0.0;
        this.targetProgress = 0.0;
        this.velocityProgress = 0.0;
        this.isAutoTurning = false;
        this.isBackSideUp = !this.isBackSideUp;
        this.paperUniforms.uIsBackSideUp.value = this.isBackSideUp ? 1.0 : 0.0;
        this.targetZoomLevel = 1.0;
        this.targetPanOffset.set(0, 0);
        this.soundEngine.triggerStickyStick(-Math.cos(this.curlAngle) * 0.45);
        this._updateSideBadge();
        this._announce(
          this.isBackSideUp
            ? 'Turned sheet to the back: The Human Side of Sauveer Sinha.'
            : 'Turned sheet to the front: Original Resume.'
        );
      }
    } else {
      const stiffness = this.targetProgress > 0.01 ? 11.5 : 15.0;
      const damping = 0.82;
      const force = (this.targetProgress - this.progress) * stiffness;
      this.velocityProgress = (this.velocityProgress + force * dt) * Math.pow(damping, dt * 60.0);
      this.progress += this.velocityProgress * dt;

      if (Math.abs(this.targetProgress - this.progress) < 0.0004 && Math.abs(this.velocityProgress) < 0.002) {
        this.progress = this.targetProgress;
        this.velocityProgress = 0.0;
      }
    }

    this.progress = Math.max(0.0, Math.min(1.0, this.progress));

    // Gentle breathing corner beckon when the 2.4s side intimation is active
    if (this.isBeckoning && !this.isDragging && !this.isAutoTurning && !this.isBackSideUp) {
      this.targetProgress = 0.058 + 0.018 * Math.sin(now * 0.0028);
    }

    // 3. Update 3D Personality Stickers & Back Composite Texture
    const isSheetCurling = this.progress > 0.012;
    this._refreshBackCompositeTexture(isSheetCurling);

    const noteLerp = Math.min(1.0, dt * 15.0);
    for (const note of this.stickyNotes) {
      note.hoverVal += (note.targetHoverVal - note.hoverVal) * noteLerp;
      note.peelVal += (note.targetPeelVal - note.peelVal) * noteLerp;

      const show3DMesh = this.isBackSideUp && !isSheetCurling;
      note.group.visible = show3DMesh;

      if (show3DMesh) {
        note.group.position.set(
          note.pos.x,
          note.pos.y,
          PAPER_THICKNESS * 0.65 + note.zOrder * 0.0018 + note.hoverVal * 0.015
        );
        note.group.rotation.z = note.rotZ;
        note.noteUniforms.uHoverLift.value = note.hoverVal;
        note.noteUniforms.uPeelLift.value = note.peelVal;
        note.shadowUniforms.uHoverLift.value = note.hoverVal;
        note.shadowUniforms.uPeelLift.value = note.peelVal;
      }
    }

    // 4. Synchronize spatialized paper Foley sound during both manual drag and full 180-degree turns
    const instSpeed = Math.abs(this.progress - prevProgress) / dt;
    const creasePan = Math.cos(this.curlAngle) * (1.0 - 2.0 * this.progress) * 0.75;
    if (this.isDragging || this.isAutoTurning) {
      this.soundEngine.updateMovement(Math.min(1.0, instSpeed * 0.72), this.progress, creasePan);
    } else {
      this.soundEngine.stopMovement();
    }

    // 5. Smoothly interpolate Zoom & 2D Pan
    const zoomLerp = Math.min(1.0, dt * 14.0);
    this.zoomLevel += (this.targetZoomLevel - this.zoomLevel) * zoomLerp;
    this.panOffset.x += (this.targetPanOffset.x - this.panOffset.x) * zoomLerp;
    this.panOffset.y += (this.targetPanOffset.y - this.panOffset.y) * zoomLerp;

    // 6. Permanent Calibrated 3D Studio Camera Positioning
    const turnTilt = Math.sin(Math.PI * this.progress) * 0.14;
    const effectiveDist = (this.baseCameraDist || 21.0) / this.zoomLevel;
    // Calibrated 3D perspective angle (`studioAngleBlend = 0.42`): unmistakable 3D depth + 100% reading clarity
    const camAngleY = -(this.studioAngleBlend * 0.25 + turnTilt * 0.30) * effectiveDist;
    const camAngleX = (this.studioAngleBlend * 0.045 - turnTilt * 0.07 * Math.cos(this.curlAngle)) * effectiveDist;
    const camZ = Math.sqrt(
      Math.max(3.5, effectiveDist * effectiveDist - camAngleY * camAngleY - camAngleX * camAngleX)
    );

    this.camera.position.set(
      camAngleX + this.panOffset.x,
      camAngleY + this.panOffset.y,
      camZ
    );
    this.camera.lookAt(this.panOffset.x, this.panOffset.y, 0);

    // 7. Update Shader Uniforms
    const velFlex = Math.max(-1.0, Math.min(1.0, ((this.progress - prevProgress) / dt) * 0.45));
    const axisX = Math.cos(this.curlAngle);
    const axisY = Math.sin(this.curlAngle);

    this.paperUniforms.uProgress.value = this.progress;
    this.paperUniforms.uCurlAxis.value.set(axisX, axisY);
    this.paperUniforms.uVelocityFlex.value = velFlex;
    this.paperUniforms.uStudioAngleFactor.value =
      this.studioAngleBlend + Math.sin(Math.PI * this.progress) * 0.35;
    this.paperUniforms.uCameraPos.value.copy(this.camera.position);

    this.deskUniforms.uProgress.value = this.progress;
    this.deskUniforms.uCurlAxis.value.set(axisX, axisY);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.paperResumeApp = new InteractivePaperResumeApp();
});
