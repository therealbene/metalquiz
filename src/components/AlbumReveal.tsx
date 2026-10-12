import { useEffect, useRef } from 'react';
import type { Album } from '../domain/types';
import './AlbumReveal.css';

interface Props {
  album: Album;
  correct: boolean;
  skipped: boolean;
  points: number;
  isLast: boolean;
  onNext: () => void;
}

export function AlbumReveal({ album, correct, skipped, points, isLast, onNext }: Props) {
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Move focus so keyboard users can continue with Enter. No scrolling: the revealed artwork stays in view.
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  const verdict = skipped ? 'Round skipped' : correct ? 'Correct' : 'Not quite';

  return (
    <section className={`reveal ${skipped ? '' : correct ? 'reveal--correct' : 'reveal--wrong'}`} aria-live="polite">
      <p className="reveal__verdict">
        {verdict}
        {correct && <span className="reveal__points"> +{points}</span>}
      </p>
      <h2 className="reveal__title">{album.albumTitle}</h2>
      <p className="reveal__artist">{album.artist}</p>
      <p className="reveal__meta">
        {album.year} · {album.subgenre}
        {album.discogsUrl && (
          <>
            {' · '}
            <a href={album.discogsUrl} target="_blank" rel="noreferrer">
              Discogs
            </a>
          </>
        )}
      </p>
      <button ref={nextRef} type="button" className="btn btn--primary reveal__next" onClick={onNext}>
        {isLast ? 'See results' : 'Next'}
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
