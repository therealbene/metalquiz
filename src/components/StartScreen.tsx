import { useState } from 'react';
import type { Category, Difficulty, GameMode } from '../domain/types';
import { CategoryPicker } from './CategoryPicker';
import { MODE_LABELS } from '../game/difficulty';
import { ModePicker } from './ModePicker';
import { DifficultyPicker } from './DifficultyPicker';
import './StartScreen.css';

interface Props {
  difficulty: Difficulty;
  category: Category;
  mode: GameMode;
  loading: boolean;
  error: string | null;
  onDifficultyChange: (d: Difficulty) => void;
  onCategoryChange: (c: Category) => void;
  onModeChange: (m: GameMode) => void;
  onStart: () => void;
}

export function StartScreen({ difficulty, category, mode, loading, error, onDifficultyChange, onCategoryChange, onModeChange, onStart }: Props) {
  // The logo lives in public/logo.png. If it is missing the screen simply starts with the title.
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <div className="start">
      {!logoFailed && (
        <img
          className="start__logo"
          src="/logo.png"
          alt=""
          decoding="async"
          onError={() => setLogoFailed(true)}
        />
      )}

      <div className="start__copy">
        <h1 className="start__title">
          Metal
          <br />
          Cover Quiz
        </h1>
        <p className="start__lead">Can you recognize a metal album from just a fragment of its cover?</p>
      </div>

      <div className="start__controls">
        <div className="start__group">
          <p className="start__label" id="mode-label">
            Mode
          </p>
          <ModePicker value={mode} onChange={onModeChange} disabled={loading} labelledBy="mode-label" />
        </div>
        <div className="start__group">
          <p className="start__label" id="genre-label">
            Genre
          </p>
          <CategoryPicker value={category} onChange={onCategoryChange} disabled={loading} labelledBy="genre-label" />
        </div>
        <div className="start__group">
          <p className="start__label" id="difficulty-label">
            Difficulty
          </p>
          <DifficultyPicker value={difficulty} onChange={onDifficultyChange} disabled={loading} />
        </div>
        {error && (
          <p className="start__error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn btn--primary start__cta" onClick={onStart} disabled={loading}>
          {loading ? 'Loading albums…' : error ? 'Try again' : 'Start Quiz'}
        </button>
        <p className="start__rules">
          {mode === 'zoom' ? MODE_LABELS.zoom.hint : '10 rounds · 4 choices · gets harder every round'}
        </p>
      </div>
    </div>
  );
}
