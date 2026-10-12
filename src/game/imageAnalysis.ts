import type { LumaGrid } from './crop';

const GRID = 64;

function loadImage(url: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed to load'));
    img.src = url;
  });
}

function toLumaGrid(img: HTMLImageElement): LumaGrid | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = GRID;
    canvas.height = GRID;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, GRID, GRID);
    const { data } = ctx.getImageData(0, 0, GRID, GRID);
    const luma = new Float32Array(GRID * GRID);
    for (let i = 0; i < luma.length; i++) {
      luma[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
    }
    return { width: GRID, height: GRID, data: luma };
  } catch {
    return null; // tainted canvas
  }
}

export interface ImageAnalysis {
  /** False when the image cannot be displayed at all. */
  loadable: boolean;
  /** Null when pixels are not readable (cross-origin image without CORS headers). */
  grid: LumaGrid | null;
}

/**
 * Loads the artwork and, when the browser allows it, samples a small luminance grid for the crop picker.
 * If pixel access is blocked we still show the image and fall back to positional hints only.
 */
export async function analyzeImage(url: string): Promise<ImageAnalysis> {
  try {
    return { loadable: true, grid: toLumaGrid(await loadImage(url, true)) };
  } catch {
    try {
      await loadImage(url, false);
      return { loadable: true, grid: null };
    } catch {
      return { loadable: false, grid: null };
    }
  }
}
