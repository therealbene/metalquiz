import type { Album, Category } from '../domain/types';

export const CATEGORIES: Category[] = ['all', 'heavy', 'thrash', 'death', 'black', 'doom', 'sludge', 'grind'];

export const CATEGORY_LABELS: Record<Category, { label: string; title: string }> = {
  all: { label: 'All', title: 'All the Metal' },
  heavy: { label: 'Heavy', title: 'Heavy, Power & Prog Metal' },
  thrash: { label: 'Thrash', title: 'Thrash Metal' },
  death: { label: 'Death', title: 'Death Metal' },
  black: { label: 'Black', title: 'Black Metal' },
  doom: { label: 'Doom', title: 'Doom Metal' },
  sludge: { label: 'Sludge', title: 'Sludge Metal' },
  grind: { label: 'Grind', title: 'Grindcore' },
};

/**
 * Maps a free-text subgenre (mock data or a Discogs style) to one quiz category.
 * Order matters: "Blackened Death Metal" counts as black, "Deathgrind" as grind, "Sludge Doom" as sludge.
 * Anything unrecognised (classic heavy metal, NWOBHM, speed, power, progressive, folk, gothic) falls into "heavy".
 */
export function categoryOf(subgenre: string): Exclude<Category, 'all'> {
  const s = subgenre.toLowerCase();
  if (/black/.test(s)) return 'black';
  if (/grind|crust/.test(s)) return 'grind';
  if (/sludge/.test(s)) return 'sludge';
  if (/death/.test(s)) return 'death';
  if (/thrash|groove/.test(s)) return 'thrash';
  if (/doom|stoner/.test(s)) return 'doom';
  return 'heavy';
}

export function filterByCategory(albums: Album[], category: Category): Album[] {
  return category === 'all' ? albums : albums.filter((a) => categoryOf(a.subgenre) === category);
}
