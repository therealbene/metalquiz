import type { Category, Difficulty } from '../domain/types';
import { generateCover } from '../data/coverArt';
import { cropToBackground } from '../game/crop';
import { CategoryPicker } from './CategoryPicker';
import { DifficultyPicker } from './DifficultyPicker';
import './StartScreen.css';

interface Props {
  difficulty: Difficulty;
  category: Category;
  loading: boolean;
  error: string | null;
  onDifficultyChange: (d: Difficulty) => void;
  onCategoryChange: (c: Category) => void;
  onStart: () => void;
}

// A fixed generated cover for the hero, independent of the configured album source.
const HERO = generateCover({
  id: 'hero',
  artist: 'Metal',
  albumTitle: 'Cover Quiz',
  subgenre: 'Heavy Metal',
  visualStyle: 'occult',
});
const HERO_STYLE = {
  backgroundImage: `url("${HERO.url}")`,
  ...cropToBackground({ x: 0.3, y: 0.34, size: 0.4 }),
};

export function StartScreen({ difficulty, category, loading, error, onDifficultyChange, onCategoryChange, onStart }: Props) {
  return (
    <div className="start">
      <div className="start__hero" aria-hidden="true">
        <div className="start__frame" style={HERO_STYLE} />
        <span className="start__tick start__tick--tl" />
        <span className="start__tick start__tick--tr" />
        <span className="start__tick start__tick--bl" />
        <span className="start__tick start__tick--br" />
      </div>

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
        <p className="start__rules">10 rounds · 4 choices · gets harder every round</p>
      </div>
    </div>
  );
}
