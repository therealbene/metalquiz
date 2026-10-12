import { useCallback, useEffect, useRef } from 'react';
import type { Question } from '../domain/types';
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
  onAnswer: (albumId: string, zoomProgress?: number) => void;
  onSkip: () => void;
  /** The artwork of a ready question failed to load; the parent may try to find a fresh URL. */
  onCoverBroken: (question: Question) => void;
  onNext: () => void;
  onQuit: () => void;
}

export function QuizScreen({ state, onAnswer, onSkip, onCoverBroken, onNext, onQuit }: Props) {
  const question = state.questions[state.index];
  const cropState = useCrop(question);
  const result = state.results[state.results.length - 1];
  const ready = cropState.status === 'ready';
  const zoomMode = state.mode === 'zoom' && question.zoomDurationMs !== undefined;
  const zoomProgress = useRef(0);

  // Reads the zoom progress at the moment of answering, so early answers score more.
  const answer = useCallback(
    (albumId: string) => onAnswer(albumId, zoomMode ? zoomProgress.current : undefined),
    [onAnswer, zoomMode],
  );

  useEffect(() => {
    if (cropState.status === 'error' && question.coverStatus === 'ready' && !state.answered) onCoverBroken(question);
  }, [cropState.status, question, state.answered, onCoverBroken]);

  // Keys 1-4 pick an answer.
  useEffect(() => {
    if (state.answered || !ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < question.answers.length) answer(question.answers[i].albumId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.answered, ready, question, answer]);

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
            zoom={zoomMode ? { durationMs: question.zoomDurationMs!, progressRef: zoomProgress } : undefined}
            onSkip={state.answered ? undefined : onSkip}
          />
        </div>
        <AnswerGrid
          answers={question.answers}
          correctAlbumId={question.album.id}
          chosenAlbumId={state.chosenAlbumId}
          answered={state.answered}
          disabled={!ready}
          onSelect={answer}
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
