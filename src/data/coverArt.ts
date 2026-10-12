import type { Rect } from '../domain/types';
import { createRng, hashString, type Rng } from '../game/rng';

/**
 * Procedural placeholder artwork.
 *
 * Real covers are copyrighted and only available through Discogs with credentials, so the mock catalogue
 * ships with generated SVG covers instead. They deliberately include a "logo" at the top and a "title"
 * at the bottom, like real metal covers, so the crop picker's text avoidance is exercised.
 */

const SIZE = 1000;
const LOGO_ZONE: Rect = { x: 0.05, y: 0.05, w: 0.9, h: 0.2 };
const TITLE_ZONE: Rect = { x: 0.05, y: 0.86, w: 0.9, h: 0.1 };

interface Palette {
  top: string;
  bottom: string;
  main: string;
  accent: string;
  dark: string;
}

const HUES: Record<string, [number, number]> = {
  occult: [350, 20],
  fantasy: [200, 280],
  gore: [345, 8],
  cosmic: [250, 310],
  industrial: [20, 45],
  landscape: [160, 210],
  beast: [80, 140],
  war: [35, 60],
  mono: [0, 0],
};

function makePalette(style: string, rng: Rng): Palette {
  const [h0, h1] = HUES[style] ?? HUES.mono;
  const hue = Math.round(h0 + (h1 - h0) * rng());
  const sat = style === 'mono' ? 4 : 45 + Math.round(rng() * 30);
  const hsl = (h: number, s: number, l: number) => `hsl(${(h + 360) % 360} ${s}% ${l}%)`;
  const flip = rng() > 0.5;
  return {
    top: hsl(hue, sat, flip ? 14 : 30),
    bottom: hsl(hue + 20, sat, flip ? 30 : 8),
    main: hsl(hue, Math.min(90, sat + 15), 52 + Math.round(rng() * 12)),
    accent: style === 'mono' ? hsl(0, 0, 88) : hsl(hue + 160 + Math.round(rng() * 40), 70, 62),
    dark: hsl(hue, Math.min(sat, 30), 5),
  };
}

const n = (v: number) => v.toFixed(1);
const range = (rng: Rng, a: number, b: number) => a + (b - a) * rng();

function stars(rng: Rng, count: number, color: string): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<circle cx="${n(range(rng, 0, SIZE))}" cy="${n(range(rng, 0, SIZE))}" r="${n(range(rng, 0.8, 3.2))}" fill="${color}" opacity="${n(range(rng, 0.3, 0.9))}"/>`;
  }
  return out;
}

function mountains(rng: Rng, layers: number, base: number, p: Palette): string {
  let out = '';
  for (let l = 0; l < layers; l++) {
    const y = base + l * 55;
    let d = `M0 ${SIZE} L0 ${n(y)}`;
    for (let x = 0; x <= SIZE; x += 70) d += ` L${x} ${n(y - range(rng, 20, 190 - l * 35))}`;
    d += ` L${SIZE} ${SIZE} Z`;
    out += `<path d="${d}" fill="${l % 2 ? p.dark : p.top}" opacity="${n(0.55 + l * 0.15)}"/>`;
  }
  return out;
}

function rays(rng: Rng, cx: number, cy: number, count: number, color: string): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.1;
    const w = 0.04 + rng() * 0.05;
    const r = 1400;
    out += `<path d="M${n(cx)} ${n(cy)} L${n(cx + Math.cos(a - w) * r)} ${n(cy + Math.sin(a - w) * r)} L${n(cx + Math.cos(a + w) * r)} ${n(cy + Math.sin(a + w) * r)}Z" fill="${color}" opacity="0.13"/>`;
  }
  return out;
}

function starPolygon(cx: number, cy: number, r: number, points: number, skip: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points; i++) {
    const a = ((i * skip) / points) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="none" stroke-linejoin="round"/>`;
}

function spikes(rng: Rng, count: number, color: string): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (i / count) * SIZE + range(rng, -20, 20);
    const h = range(rng, 90, 330);
    out += `<path d="M${n(x)} ${SIZE} L${n(x + SIZE / count / 2)} ${n(SIZE - h)} L${n(x + SIZE / count)} ${SIZE}Z" fill="${color}"/>`;
  }
  return out;
}

function blobs(rng: Rng, count: number, color: string, cx: number, cy: number, spread: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = cx + range(rng, -spread, spread);
    const y = cy + range(rng, -spread, spread);
    const r = range(rng, 8, 90);
    out += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}" opacity="${n(range(rng, 0.5, 0.95))}"/>`;
    if (rng() > 0.55) {
      out += `<rect x="${n(x - r / 5)}" y="${n(y)}" width="${n(r / 2.5)}" height="${n(range(rng, 60, 320))}" rx="${n(r / 5)}" fill="${color}" opacity="0.8"/>`;
    }
  }
  return out;
}

function stripes(rng: Rng, color: string): string {
  let out = '';
  const gap = range(rng, 28, 60);
  const angle = n(range(rng, 20, 35));
  for (let x = -SIZE; x < SIZE * 2; x += gap) {
    out += `<rect x="${n(x)}" y="-100" width="${n(gap / 3)}" height="1300" fill="${color}" opacity="0.18" transform="rotate(${angle} 500 500)"/>`;
  }
  return out;
}

function motif(style: string, rng: Rng, p: Palette): string {
  const cx = range(rng, 380, 620);
  const cy = range(rng, 400, 580);
  switch (style) {
    case 'occult': {
      const r = range(rng, 190, 260);
      return (
        rays(rng, cx, cy, 18, p.accent) +
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 1.12)}" fill="${p.dark}" opacity="0.7"/>` +
        `<g stroke="${p.main}" stroke-width="7" fill="none"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>${starPolygon(cx, cy, r, 5, 2)}${starPolygon(cx, cy, r * 0.5, 5, 2)}</g>` +
        spikes(rng, 14, p.dark)
      );
    }
    case 'fantasy':
      return (
        stars(rng, 70, p.accent) +
        `<circle cx="${n(cx)}" cy="${n(range(rng, 330, 470))}" r="${n(range(rng, 110, 190))}" fill="${p.accent}" opacity="0.9"/>` +
        `<circle cx="${n(cx + 50)}" cy="${n(range(rng, 310, 450))}" r="${n(range(rng, 100, 170))}" fill="${p.top}" opacity="0.35"/>` +
        mountains(rng, 4, 640, p)
      );
    case 'gore':
      return (
        stripes(rng, p.dark) +
        `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(range(rng, 190, 280))}" ry="${n(range(rng, 150, 250))}" fill="${p.dark}" opacity="0.8"/>` +
        blobs(rng, 46, p.main, cx, cy, 250) +
        blobs(rng, 14, p.accent, cx, cy + 40, 160)
      );
    case 'cosmic': {
      const r = range(rng, 150, 230);
      return (
        stars(rng, 140, p.accent) +
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${p.main}"/>` +
        `<circle cx="${n(cx + r * 0.35)}" cy="${n(cy - r * 0.2)}" r="${n(r * 0.85)}" fill="${p.dark}" opacity="0.55"/>` +
        `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r * 1.9)}" ry="${n(r * 0.4)}" fill="none" stroke="${p.accent}" stroke-width="6" opacity="0.8" transform="rotate(${n(range(rng, -25, 25))} ${n(cx)} ${n(cy)})"/>`
      );
    }
    case 'industrial': {
      const r = range(rng, 150, 230);
      let teeth = '';
      for (let i = 0; i < 16; i++) {
        teeth += `<rect x="${n(cx - 24)}" y="${n(cy - r - 44)}" width="48" height="70" fill="${p.main}" transform="rotate(${i * 22.5} ${n(cx)} ${n(cy)})"/>`;
      }
      return (
        stripes(rng, p.accent) +
        teeth +
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${p.main}"/>` +
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.45)}" fill="${p.dark}"/>` +
        `<rect x="0" y="${n(range(rng, 700, 790))}" width="1000" height="22" fill="${p.accent}" opacity="0.7"/>`
      );
    }
    case 'landscape':
      return (
        `<circle cx="${n(range(rng, 250, 750))}" cy="${n(range(rng, 360, 470))}" r="${n(range(rng, 70, 130))}" fill="${p.accent}" opacity="0.85"/>` +
        stars(rng, 40, p.accent) +
        mountains(rng, 5, 520, p)
      );
    case 'beast': {
      const w = range(rng, 150, 240);
      return (
        rays(rng, cx, cy, 12, p.accent) +
        `<path d="M${n(cx - w * 1.5)} ${n(cy)} Q${n(cx)} ${n(cy - w)} ${n(cx + w * 1.5)} ${n(cy)} Q${n(cx)} ${n(cy + w)} ${n(cx - w * 1.5)} ${n(cy)}Z" fill="${p.dark}" stroke="${p.main}" stroke-width="8"/>` +
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(w * 0.5)}" fill="${p.accent}"/>` +
        `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(w * 0.12)}" ry="${n(w * 0.45)}" fill="${p.dark}"/>` +
        spikes(rng, 10, p.dark)
      );
    }
    case 'war':
      return (
        `<circle cx="${n(cx)}" cy="${n(range(rng, 400, 520))}" r="${n(range(rng, 130, 200))}" fill="${p.accent}" opacity="0.8"/>` +
        stripes(rng, p.dark) +
        `<path d="M0 760 L${n(range(rng, 200, 420))} 600 L${n(range(rng, 520, 760))} 700 L1000 560 L1000 1000 L0 1000Z" fill="${p.dark}" opacity="0.9"/>` +
        spikes(rng, 8, p.main)
      );
    default: {
      // mono: stark geometric figure
      const r = range(rng, 160, 250);
      return (
        stripes(rng, '#fff') +
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${p.accent}" opacity="0.92"/>` +
        `<rect x="${n(cx - r * 1.3)}" y="${n(cy - 12)}" width="${n(r * 2.6)}" height="24" fill="${p.dark}"/>` +
        `<rect x="${n(cx - 12)}" y="${n(cy - r * 1.3)}" width="24" height="${n(r * 2.6)}" fill="${p.dark}"/>`
      );
    }
  }
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface CoverInput {
  id: string;
  artist: string;
  albumTitle: string;
  subgenre: string;
  visualStyle: string;
}

export function generateCover(input: CoverInput): { url: string; avoidRegions: Rect[] } {
  const rng = createRng(hashString(input.id));
  const p = makePalette(input.visualStyle, rng);
  const artist = escapeXml(input.artist.toUpperCase());
  const title = escapeXml(input.albumTitle.toUpperCase());
  const logoLen = Math.min(820, input.artist.length * 78);
  const titleLen = Math.min(800, input.albumTitle.length * 34);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.bottom}"/></linearGradient>
<radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/></radialGradient>
<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${hashString(input.id) % 100}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/></filter>
</defs>
<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
${motif(input.visualStyle, rng, p)}
<rect width="${SIZE}" height="${SIZE}" fill="url(#vg)"/>
<rect width="${SIZE}" height="${SIZE}" filter="url(#gr)" opacity="0.16"/>
<text x="500" y="190" text-anchor="middle" font-family="Impact, 'Arial Narrow Bold', 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="132" fill="#f4efe4" stroke="#000" stroke-width="5" paint-order="stroke" textLength="${logoLen}" lengthAdjust="spacingAndGlyphs">${artist}</text>
<text x="500" y="930" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-weight="700" font-size="52" letter-spacing="4" fill="#f4efe4" stroke="#000" stroke-width="3" paint-order="stroke" textLength="${titleLen}" lengthAdjust="spacingAndGlyphs">${title}</text>
</svg>`;

  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    avoidRegions: [LOGO_ZONE, TITLE_ZONE],
  };
}
