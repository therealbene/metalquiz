import { useEffect, useState } from 'react';
import { albumSource } from '../data/activeSource';
import { pickCrop, type CropRegion } from '../game/crop';
import { analyzeImage } from '../game/imageAnalysis';
import { randomSeed } from '../game/rng';

export interface HeroCover {
  url: string;
  crop: CropRegion;
}

const HERO_CROP_SIZE = 0.5;

/**
 * Picks a random album cover and a random crop for the start screen. Returns null until it is ready,
 * and stays null if anything fails, so the caller keeps its fallback artwork.
 */
export function useHeroCover(): HeroCover | null {
  const [hero, setHero] = useState<HeroCover | null>(null);

  useEffect(() => {
    if (!albumSource.getRandomAlbum) return;
    const controller = new AbortController();
    (async () => {
      try {
        const album = await albumSource.getRandomAlbum!(controller.signal);
        const analysis = await analyzeImage(album.coverImageUrl);
        if (!analysis.loadable || controller.signal.aborted) return;
        const crop = pickCrop({
          size: HERO_CROP_SIZE,
          grid: analysis.grid,
          avoid: album.avoidRegions,
          seed: randomSeed(),
        });
        setHero({ url: album.coverImageUrl, crop });
      } catch {
        /* decorative only: keep the fallback */
      }
    })();
    return () => controller.abort();
  }, []);

  return hero;
}
