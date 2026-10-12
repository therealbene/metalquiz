import type { GameMode } from '../domain/types';
import { MODE_LABELS } from '../game/difficulty';
import './ModePicker.css';

interface Props {
  value: GameMode;
  onChange: (m: GameMode) => void;
  disabled?: boolean;
  labelledBy: string;
}

const OPTIONS: GameMode[] = ['classic', 'zoom'];

export function ModePicker({ value, onChange, disabled, labelledBy }: Props) {
  return (
    <div className="mode" role="radiogroup" aria-labelledby={labelledBy}>
      {OPTIONS.map((m) => (
        <label key={m} className="mode__option">
          <input type="radio" name="mode" value={m} checked={value === m} disabled={disabled} onChange={() => onChange(m)} />
          <span className="mode__label" title={MODE_LABELS[m].hint}>
            {MODE_LABELS[m].label}
          </span>
        </label>
      ))}
    </div>
  );
}
