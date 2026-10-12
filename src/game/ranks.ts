export interface Rank {
  title: string;
  blurb: string;
}

const RANKS: { min: number; rank: Rank }[] = [
  { min: 10, rank: { title: 'Metal God', blurb: 'Flawless. The riff lords bow to you.' } },
  { min: 9, rank: { title: 'Metal Master', blurb: 'One slip away from perfection.' } },
  { min: 7, rank: { title: 'True Metal Maniac', blurb: 'Your record shelf has seen things.' } },
  { min: 5, rank: { title: 'Metalhead', blurb: 'Solid. You know your way around a pit.' } },
  { min: 3, rank: { title: 'Headbanger', blurb: 'Good instincts. Dig deeper into the crates.' } },
  { min: 0, rank: { title: 'Poser', blurb: 'Time to put on some actual records.' } },
];

export function getRank(correct: number): Rank {
  return (RANKS.find((r) => correct >= r.min) ?? RANKS[RANKS.length - 1]).rank;
}
