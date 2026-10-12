export interface Rank {
  title: string;
  blurb: string;
}

const RANKS: { min: number; rank: Rank }[] = [
  { min: 10, rank: { title: 'Metal God', blurb: 'Flawless victory. Mortals tremble. Lightning strikes your living room.' } },
  { min: 9, rank: { title: 'Metal Master', blurb: 'One tiny slip from godhood. The riff lords salute you.' } },
  { min: 7, rank: { title: 'True Metal Maniac', blurb: 'Your record shelf has seen things. Dark things. Gloriously.' } },
  { min: 5, rank: { title: 'Metalhead', blurb: 'Solid! You have survived many a pit and lost only one shoe.' } },
  { min: 3, rank: { title: 'Headbanger', blurb: 'Good neck, decent instincts. Now go dig in the crates.' } },
  { min: 0, rank: { title: 'Poser', blurb: 'Did you buy that shirt at the mall? Go listen to actual records.' } },
];

export function getRank(correct: number): Rank {
  return (RANKS.find((r) => correct >= r.min) ?? RANKS[RANKS.length - 1]).rank;
}
