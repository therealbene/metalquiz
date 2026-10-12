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
  // The logo (public/logo.webp) is the page title. If it is missing the plain text title is shown instead.
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <div className="start">
      <div className="start__copy">
        {logoFailed ? (
          <h1 className="start__title">
            Metal
            <br />
            Cover Quiz
          </h1>
        ) : (
          <h1 className="start__logo-title">
            <img
              className="start__logo"
              src="/logo.webp"
              alt="Metal Cover Quiz"
              decoding="async"
              onError={() => setLogoFailed(true)}
            />
          </h1>
        )}
        <p className="start__lead">A scrap of a cover. Four albums. One chance to prove you're no poser.</p>
      </div>

      <div className="start__controls">
        <div className="start__group">
          <p className="start__label" id="mode-label">
            Pick your weapon
          </p>
          <ModePicker value={mode} onChange={onModeChange} disabled={loading} labelledBy="mode-label" />
        </div>
        <div className="start__group">
          <p className="start__label" id="genre-label">
            Pick your poison
          </p>
          <CategoryPicker value={category} onChange={onCategoryChange} disabled={loading} labelledBy="genre-label" />
        </div>
        <div className="start__group">
          <p className="start__label" id="difficulty-label">
            How brutal?
          </p>
          <DifficultyPicker value={difficulty} onChange={onDifficultyChange} disabled={loading} />
        </div>
        {error && (
          <p className="start__error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn btn--primary start__cta" onClick={onStart} disabled={loading}>
          {loading ? 'Summoning albums…' : error ? 'Summon again' : 'Start the Mayhem'}
        </button>
        <p className="start__rules">
          {mode === 'zoom' ? MODE_LABELS.zoom.hint : '10 rounds · 4 choices · it only gets nastier'}
        </p>
      </div>
    </div>
  );
}
