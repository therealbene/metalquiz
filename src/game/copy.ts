/** Short, over-the-top verdicts shown after each answer. Picked by round so a game reads as varied but is stable on re-render. */
const CORRECT = [
  'Savage. Correct.',
  'Correct. The pit approves.',
  'Correct. Hail yourself.',
  'Correct. Louder!',
  'Correct. Absolutely feral.',
];

const WRONG = [
  'Wrong. A poser is born.',
  'Wrong. Your ancestors weep.',
  'Wrong. The riff gods frown.',
  'Wrong. Back to the crates.',
  'Wrong. Shameful.',
];

export const SKIPPED_LINE = 'Round banished';

export function verdictLine(correct: boolean, round: number): string {
  const lines = correct ? CORRECT : WRONG;
  return lines[Math.abs(round) % lines.length];
}
