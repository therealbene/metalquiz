import { useState } from 'react';
import type { GameState } from '../game/reducer';
import { summarize } from '../game/reducer';
import { formatTime } from '../game/format';
import { getRank } from '../game/ranks';
import { CATEGORY_LABELS } from '../game/categories';
import { DIFFICULTY_LABELS, MODE_LABELS } from '../game/difficulty';
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
    `🤘 Metal Cover Quiz (${MODE_LABELS[state.mode].label}): ${CATEGORY_LABELS[state.category].title}, ${DIFFICULTY_LABELS[state.difficulty].label}`,
    `${rank}: ${correct}/${total}, ${state.score.toLocaleString('en-US')} pts`,
    grid,
  ].join('\n');
}

export function ResultsScreen({ state, onPlayAgain, onTryHard, onHome }: Props) {
  const { correct, total, accuracy } = summarize(state.results);
  const rank = getRank(correct);
  const timed = state.results.filter((r) => !r.skipped && r.timeMs !== undefined);
  const averageMs = timed.length ? timed.reduce((sum, r) => sum + (r.timeMs ?? 0), 0) / timed.length : null;
  const [shareNote, setShareNote] = useState('');

  const share = async () => {
    const text = shareText(state, correct, total, rank.title);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote('Copied. Go spread the word.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShareNote('The ritual failed. Could not share.');
    }
    setTimeout(() => setShareNote(''), 2500);
  };

  const stats = [
    { label: 'Nailed it', value: `${correct}/${total}` },
    { label: 'Accuracy', value: `${accuracy}%` },
    { label: 'Best streak', value: String(state.bestStreak) },
  ];

  return (
    <div className="results">
      <header className="results__head">
        <p className="results__eyebrow">
          {CATEGORY_LABELS[state.category].title} · {DIFFICULTY_LABELS[state.difficulty].label}
          {state.mode === 'zoom' ? ' · Zoom' : ''}
        </p>
        <h1 className="results__rank">{rank.title}</h1>
        <p className="results__blurb">{rank.blurb}</p>
      </header>

      <div className="results__score">
        <p className="results__score-label">Points</p>
        <p className="results__score-value">{state.score.toLocaleString('en-US')}</p>
      </div>

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
          Again! Again! Again!
        </button>
        {state.difficulty !== 'hard' && (
          <button type="button" className="btn btn--ghost" onClick={onTryHard}>
            Try Brutal Mode
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={share}>
          Brag to your friends
        </button>
        <p className="results__note" role="status">
          {shareNote}
        </p>
        <button type="button" className="results__home" onClick={onHome}>
          Retreat to the start
        </button>
      </div>

      <section className="results__breakdown" aria-labelledby="breakdown-title">
        <h2 className="results__breakdown-title" id="breakdown-title">
          Points per cover
        </h2>
        <ol className="results__rounds">
          {state.questions.map((q, i) => {
            const r = state.results[i];
            const mark = r?.skipped ? '–' : r?.correct ? '✓' : '✕';
            const cls = r?.skipped ? 'skipped' : r?.correct ? 'correct' : 'wrong';
            const points = r?.points ?? 0;
            return (
              <li key={q.id} className={`results__round results__round--${cls}`}>
                <span className="results__mark" aria-label={cls}>
                  {mark}
                </span>
                {q.album.coverImageUrl ? (
                  <img className="results__thumb" src={q.album.coverImageUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="results__thumb results__thumb--empty" aria-hidden="true" />
                )}
                <span className="results__round-info">
                  <span className="results__round-name">
                    {q.album.artist} — {q.album.albumTitle}
                  </span>
                  <span className="results__round-year">
                    {q.album.year}
                    {r?.timeMs !== undefined && !r.skipped && ` · ${formatTime(r.timeMs)}`}
                  </span>
                </span>
                <span className="results__points" aria-label={`${points} points`}>
                  {r?.skipped ? '–' : points > 0 ? `+${points.toLocaleString('en-US')}` : '0'}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="results__total">
          <span>Total</span>
          <strong>{state.score.toLocaleString('en-US')}</strong>
        </p>
        {averageMs !== null && (
          <p className="results__average">
            Average time per cover: <strong>{formatTime(averageMs)}</strong>
          </p>
        )}
      </section>
    </div>
  );
}
