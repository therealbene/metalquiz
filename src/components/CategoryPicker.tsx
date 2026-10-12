import type { Category } from '../domain/types';
import { CATEGORIES, CATEGORY_LABELS } from '../game/categories';
import './CategoryPicker.css';

interface Props {
  value: Category;
  onChange: (c: Category) => void;
  disabled?: boolean;
  labelledBy: string;
}

export function CategoryPicker({ value, onChange, disabled, labelledBy }: Props) {
  return (
    <div className="genre" role="radiogroup" aria-labelledby={labelledBy}>
      {CATEGORIES.map((c) => (
        <label key={c} className="genre__option" title={CATEGORY_LABELS[c].title}>
          <input
            type="radio"
            name="genre"
            value={c}
            checked={value === c}
            disabled={disabled}
            onChange={() => onChange(c)}
          />
          <span className="genre__label">{CATEGORY_LABELS[c].label}</span>
        </label>
      ))}
    </div>
  );
}
