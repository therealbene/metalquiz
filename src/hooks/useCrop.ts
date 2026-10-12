import { useEffect, useState } from 'react';
import type { Question } from '../domain/types';
import { pickCrop, type CropRegion } from '../game/crop';
import { analyzeImage } from '../game/imageAnalysis';

export type CropState =
  | { status: 'loading' }
  | { status: 'ready'; crop: CropRegion }
  | { status: 'error' };

const pending = new Map<string, Promise<CropState>>();

/** Resolves (and memoises) the crop for a question. Also used to prefetch the next round. */
export function prepareCrop(q: Question): Promise<CropState> {
  // The source is still looking up this cover, or could not find one. Nothing to analyse or cache yet.
  if (q.coverStatus === 'pending') return Promise.resolve({ status: 'loading' });
  if (q.coverStatus === 'failed') return Promise.resolve({ status: 'error' });
  const key = `${q.id}:${q.cropSeed}:${q.cropSize}`;
  let p = pending.get(key);
  if (!p) {
    p = analyzeImage(q.album.coverImageUrl).then((a): CropState =>
      a.loadable
        ? {
            status: 'ready',
            crop: pickCrop({ size: q.cropSize, grid: a.grid, avoid: q.album.avoidRegions, seed: q.cropSeed }),
          }
        : { status: 'error' },
    );
    pending.set(key, p);
  }
  return p;
}

export function useCrop(question: Question): CropState {
  const [state, setState] = useState<{ id: string; value: CropState }>({
    id: question.id,
    value: { status: 'loading' },
  });

  useEffect(() => {
    let live = true;
    prepareCrop(question).then((value) => live && setState({ id: question.id, value }));
    return () => {
      live = false;
    };
  }, [question]);

  // Avoid flashing the previous round's crop while the next one resolves.
  return state.id === question.id ? state.value : { status: 'loading' };
}

/** Test/reset helper. */
export function clearCropCache(): void {
  pending.clear();
}

