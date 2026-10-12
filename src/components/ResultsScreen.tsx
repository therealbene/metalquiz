import { useState } from 'react';
import type { GameState } from '../game/reducer';
import { summarize } from '../game/reducer';
import { getRank } from '../game/ranks';
import { CATEGORY_LABELS } from '../game/categories';
import { DIFFICULTY_LABELS } from '../game/difficulty';
import './ResultsScreen.css';

type Results = Extract<GameState, { phase: 'results' }>;

interface Props {
  state: Results;
  onPlayAgain: () => void;
  onTryHard: () => void;
  onHome: () => void;
}

function shareText(state: Results, correct: number, total: number, rank: string): string {
  const grid = state.results.map((r) => (r.skipped ? '⬛' : r.correct ? '🟩' : '🟥')).join('');
  return [
    `Metal Cover Quiz: ${CATEGORY_LABELS[state.category].title}, ${DIFFICULTY_LABELS[state.difficulty].label}`,
    `${rank}: ${correct}/${total}, ${state.score.toLocaleString('en-US')} pts`,
    grid,
  ].join('\n');
}

export function ResultsScreen({ state, onPlayAgain, onTryHard, onHome }: Props) {
  const { correct, total, accuracy } = summarize(state.results);
  const rank = getRank(correct);
  const [shareNote, setShareNote] = useState('');

  const share = async () => {
    const text = shareText(state, correct, total, rank.title);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote('Copied to clipboard');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShareNote('Could not share');
    }
    setTimeout(() => setShareNote(''), 2500);
  };

  const stats = [
    { label: 'Score', value: state.score.toLocaleString('en-US') },
    { label: 'Correct', value: `${correct}/${total}` },
    { label: 'Accuracy', value: `${accuracy}%` },
    { label: 'Best streak', value: String(state.bestStreak) },
  ];

  return (
    <div className="results">
      <header className="results__head">
        <p className="results__eyebrow">
          {CATEGORY_LABELS[state.category].title} · {DIFFICULTY_LABELS[state.difficulty].label}
        </p>
        <h1 className="results__rank">{rank.title}</h1>
        <p className="results__blurb">{rank.blurb}</p>
      </header>

      <dl className="results__stats">
        {stats.map((s) => (
          <div key={s.label} className="results__stat">
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="results__actions">
        <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
          Play Again
        </button>
        {state.difficulty !== 'hard' && (
          <button type="button" className="btn btn--ghost" onClick={onTryHard}>
            Try Hard Mode
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={share}>
          Share result
        </button>
        <p className="results__note" role="status">
          {shareNote}
        </p>
        <button type="button" className="results__home" onClick={onHome}>
          Back to start
        </button>
      </div>

      <ol className="results__rounds" aria-label="Round by round">
        {state.questions.map((q, i) => {
          const r = state.results[i];
          const mark = r?.skipped ? '–' : r?.correct ? '✓' : '✕';
          const cls = r?.skipped ? 'skipped' : r?.correct ? 'correct' : 'wrong';
          return (
            <li key={q.id} className={`results__round results__round--${cls}`}>
              <span className="results__mark" aria-label={cls}>
                {mark}
              </span>
              <span className="results__round-name">
                {q.album.artist} — {q.album.albumTitle}
              </span>
              <span className="results__round-year">{q.album.year}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
