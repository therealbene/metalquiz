import type { RoundResult } from '../domain/types';
import './ProgressIndicator.css';

interface Props {
  total: number;
  /** Zero-based index of the current round. */
  current: number;
  results: RoundResult[];
}

export function ProgressIndicator({ total, current, results }: Props) {
  return (
    <ol className="progress" aria-label="Round progress">
      {Array.from({ length: total }, (_, i) => {
        const r = results.find((x) => x.round === i + 1);
        const state = r ? (r.skipped ? 'skipped' : r.correct ? 'correct' : 'wrong') : i === current ? 'current' : 'todo';
        return <li key={i} className={`progress__seg progress__seg--${state}`} aria-label={`Round ${i + 1}: ${state}`} />;
      })}
    </ol>
  );
}
