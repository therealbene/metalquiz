import { useCountUp } from '../hooks/useCountUp';
import './ScoreDisplay.css';

interface Props {
  score: number;
  streak: number;
  /** Points gained in the current round; shown briefly as a "+N" chip. */
  award: number;
}

export function ScoreDisplay({ score, streak, award }: Props) {
  const shown = useCountUp(score);
  return (
    <dl className="score">
      <div className="score__item">
        <dt>Score</dt>
        <dd className="score__value">
          {shown.toLocaleString('en-US')}
          {award > 0 && (
            <span key={score} className="score__award" aria-hidden="true">
              +{award}
            </span>
          )}
        </dd>
      </div>
      <div className="score__item">
        <dt>Streak</dt>
        <dd className="score__value">{streak}</dd>
      </div>
    </dl>
  );
}
