import type { Album, Category } from '../domain/types';

export const CATEGORIES: Category[] = ['all', 'heavy', 'thrash', 'death', 'black', 'doom', 'power', 'prog'];

export const CATEGORY_LABELS: Record<Category, { label: string; title: string }> = {
  all: { label: 'All', title: 'All Metal' },
  heavy: { label: 'Heavy', title: 'Heavy Metal & NWOBHM' },
  thrash: { label: 'Thrash', title: 'Thrash Metal' },
  death: { label: 'Death', title: 'Death Metal' },
  black: { label: 'Black', title: 'Black Metal' },
  doom: { label: 'Doom', title: 'Doom Metal' },
  power: { label: 'Power', title: 'Power Metal' },
  prog: { label: 'Prog', title: 'Progressive Metal' },
};

/**
 * Maps a free-text subgenre (mock data or a Discogs style) to one quiz category.
 * Order matters: "Blackened Death Metal" counts as black, "Progressive Death Metal" as prog.
 * Anything unrecognised (speed, folk, gothic, classic heavy metal) falls into "heavy".
 */
export function categoryOf(subgenre: string): Exclude<Category, 'all'> {
  const s = subgenre.toLowerCase();
  if (/black/.test(s)) return 'black';
  if (/prog/.test(s)) return 'prog';
  if (/death|grind/.test(s)) return 'death';
  if (/thrash|groove/.test(s)) return 'thrash';
  if (/doom|stoner/.test(s)) return 'doom';
  if (/power/.test(s)) return 'power';
  return 'heavy';
}

export function filterByCategory(albums: Album[], category: Category): Album[] {
  return category === 'all' ? albums : albums.filter((a) => categoryOf(a.subgenre) === category);
}
