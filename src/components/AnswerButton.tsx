import type { Answer } from '../domain/types';
import './AnswerButton.css';

export type AnswerState = 'idle' | 'correct' | 'wrong' | 'dimmed';

interface Props {
  answer: Answer;
  index: number;
  state: AnswerState;
  disabled: boolean;
  onSelect: (albumId: string) => void;
}

const STATE_TEXT: Partial<Record<AnswerState, string>> = { correct: 'Correct answer', wrong: 'Your answer, incorrect' };

export function AnswerButton({ answer, index, state, disabled, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`answer answer--${state}`}
      disabled={disabled}
      onClick={() => onSelect(answer.albumId)}
    >
      <span className="answer__key" aria-hidden="true">
        {index + 1}
      </span>
      <span className="answer__label">
        <span className="answer__artist">{answer.artist}</span>
        <span className="answer__sep" aria-hidden="true"> — </span>
        <span className="sr-only">, </span>
        <span className="answer__title">{answer.albumTitle}</span>
      </span>
      {STATE_TEXT[state] && <span className="sr-only">{STATE_TEXT[state]}</span>}
      <span className="answer__mark" aria-hidden="true">
        {state === 'correct' ? '✓' : state === 'wrong' ? '✕' : ''}
      </span>
    </button>
  );
}
