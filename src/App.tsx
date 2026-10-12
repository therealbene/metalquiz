import { ResultsScreen } from './components/ResultsScreen';
import { QuizScreen } from './components/QuizScreen';
import { StartScreen } from './components/StartScreen';
import { useQuiz } from './hooks/useQuiz';

export function App() {
  const quiz = useQuiz();
  const { state } = quiz;

  return (
    <div className="app">
      <main className="app__main">
        {(state.phase === 'start' || state.phase === 'loading' || state.phase === 'error') && (
          <StartScreen
            difficulty={state.difficulty}
            category={state.category}
            mode={state.mode}
            loading={state.phase === 'loading'}
            error={state.phase === 'error' ? state.message : null}
            onDifficultyChange={quiz.setDifficulty}
            onCategoryChange={quiz.setCategory}
            onModeChange={quiz.setMode}
            onStart={() => quiz.start(state.difficulty, state.category, state.mode)}
          />
        )}
        {state.phase === 'playing' && (
          <QuizScreen state={state} onAnswer={quiz.answer} onSkip={quiz.skip} onNext={quiz.next} onQuit={quiz.reset} />
        )}
        {state.phase === 'results' && (
          <ResultsScreen
            state={state}
            onPlayAgain={() => quiz.start(state.difficulty, state.category, state.mode)}
            onTryHard={() => quiz.start('hard', state.category, state.mode)}
            onHome={quiz.reset}
          />
        )}
      </main>
      <footer className="app__footer">
        {quiz.attribution ? (
          <a href={quiz.attribution.href} target="_blank" rel="noreferrer">
            {quiz.attribution.text}
          </a>
        ) : (
          <span>Demo mode: generated artwork, no real covers</span>
        )}
      </footer>
    </div>
  );
}
