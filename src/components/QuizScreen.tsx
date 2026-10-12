import { useEffect } from 'react';
import { useCrop } from '../hooks/useCrop';
import type { GameState } from '../game/reducer';
import { AlbumReveal } from './AlbumReveal';
import { AnswerGrid } from './AnswerGrid';
import { ArtworkCrop } from './ArtworkCrop';
import { QuizHeader } from './QuizHeader';
import './QuizScreen.css';

type Playing = Extract<GameState, { phase: 'playing' }>;

interface Props {
  state: Playing;
  onAnswer: (albumId: string) => void;
  onSkip: () => void;
  onNext: () => void;
  onQuit: () => void;
}

export function QuizScreen({ state, onAnswer, onSkip, onNext, onQuit }: Props) {
  const question = state.questions[state.index];
  const cropState = useCrop(question);
  const result = state.results[state.results.length - 1];
  const ready = cropState.status === 'ready';

  // Keys 1-4 pick an answer.
  useEffect(() => {
    if (state.answered || !ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < question.answers.length) onAnswer(question.answers[i].albumId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.answered, ready, question, onAnswer]);

  return (
    <div className="quiz">
      <QuizHeader
        round={question.round}
        totalRounds={state.questions.length}
        score={state.score}
        streak={state.streak}
        award={state.lastAward}
        results={state.results}
        onQuit={onQuit}
      />
      {/* Keyed by round so each question fades in as a fresh unit. */}
      <div className="quiz__round" key={question.id}>
        <div className="quiz__art">
          <ArtworkCrop
            src={question.album.coverImageUrl}
            crop={cropState.status === 'ready' ? cropState.crop : null}
            failed={cropState.status === 'error'}
            revealed={state.answered}
            verdict={state.answered && result && !result.skipped ? (result.correct ? 'correct' : 'wrong') : null}
            revealedLabel={`Cover of ${question.album.albumTitle} by ${question.album.artist}`}
            onSkip={state.answered ? undefined : onSkip}
          />
        </div>
        <AnswerGrid
          answers={question.answers}
          correctAlbumId={question.album.id}
          chosenAlbumId={state.chosenAlbumId}
          answered={state.answered}
          disabled={!ready}
          onSelect={onAnswer}
        />
        {state.answered && result && (
          <AlbumReveal
            album={question.album}
            correct={result.correct}
            skipped={result.skipped}
            points={result.points}
            isLast={state.index + 1 >= state.questions.length}
            onNext={onNext}
          />
        )}
      </div>
    </div>
  );
}
