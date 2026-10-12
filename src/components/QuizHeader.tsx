import type { RoundResult } from '../domain/types';
import { ProgressIndicator } from './ProgressIndicator';
import { ScoreDisplay } from './ScoreDisplay';
import './QuizHeader.css';

interface Props {
  round: number;
  totalRounds: number;
  score: number;
  streak: number;
  award: number;
  results: RoundResult[];
  onQuit: () => void;
}

export function QuizHeader({ round, totalRounds, score, streak, award, results, onQuit }: Props) {
  return (
    <header className="quiz-header">
      <div className="quiz-header__row">
        <button type="button" className="quiz-header__quit" onClick={onQuit} aria-label="Quit quiz">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="quiz-header__round">
          Round {round} <span>/ {totalRounds}</span>
        </h1>
        <ScoreDisplay score={score} streak={streak} award={award} />
      </div>
      <ProgressIndicator total={totalRounds} current={round - 1} results={results} />
    </header>
  );
}
