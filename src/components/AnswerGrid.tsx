import type { Answer } from '../domain/types';
import { AnswerButton, type AnswerState } from './AnswerButton';
import './AnswerGrid.css';

interface Props {
  answers: Answer[];
  correctAlbumId: string;
  chosenAlbumId: string | null;
  answered: boolean;
  disabled?: boolean;
  onSelect: (albumId: string) => void;
}

export function AnswerGrid({ answers, correctAlbumId, chosenAlbumId, answered, disabled, onSelect }: Props) {
  const stateFor = (id: string): AnswerState => {
    if (!answered) return 'idle';
    if (id === correctAlbumId) return 'correct';
    if (id === chosenAlbumId) return 'wrong';
    return 'dimmed';
  };

  return (
    <div className="answer-grid" role="group" aria-label="Choose the album">
      {answers.map((a, i) => (
        // On short screens the non-relevant answers collapse after answering to make room for the reveal card.
        <div key={a.albumId} className={`answer-slot${stateFor(a.albumId) === 'dimmed' ? ' answer-slot--dimmed' : ''}`}>
          <div className="answer-slot__inner">
            <AnswerButton
              answer={a}
              index={i}
              state={stateFor(a.albumId)}
              disabled={answered || !!disabled}
              onSelect={onSelect}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
