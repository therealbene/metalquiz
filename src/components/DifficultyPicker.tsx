import type { Difficulty } from '../domain/types';
import { DIFFICULTY_LABELS } from '../game/difficulty';
import './DifficultyPicker.css';

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  disabled?: boolean;
}

const OPTIONS: Difficulty[] = ['easy', 'normal', 'hard'];

export function DifficultyPicker({ value, onChange, disabled }: Props) {
  return (
    <fieldset className="difficulty" disabled={disabled}>
      <legend className="sr-only">Difficulty</legend>
      {OPTIONS.map((d) => (
        <label key={d} className="difficulty__option">
          <input type="radio" name="difficulty" value={d} checked={value === d} onChange={() => onChange(d)} />
          <span className="difficulty__label">{DIFFICULTY_LABELS[d].label}</span>
        </label>
      ))}
      <p className="difficulty__hint">{DIFFICULTY_LABELS[value].hint}</p>
    </fieldset>
  );
}
