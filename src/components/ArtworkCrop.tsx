import type { CSSProperties } from 'react';
import { cropToBackground, type CropRegion } from '../game/crop';
import './ArtworkCrop.css';

interface Props {
  src: string;
  crop: CropRegion | null;
  revealed: boolean;
  /** Shown to assistive tech only after the reveal, so it never gives the answer away. */
  revealedLabel: string;
  failed?: boolean;
  /** Feedback badge shown on the artwork after answering. */
  verdict?: 'correct' | 'wrong' | null;
  onSkip?: () => void;
}

const FULL: CSSProperties = { backgroundSize: '100% auto', backgroundPosition: '0% 0%' };

/**
 * Shows a section of one image using CSS background sizing and positioning,
 * then animates to the full artwork. No extra image files are created.
 */
export function ArtworkCrop({ src, crop, revealed, revealedLabel, failed, verdict, onSkip }: Props) {
  const style: CSSProperties | undefined =
    crop && !failed ? { backgroundImage: `url("${src}")`, ...(revealed ? FULL : cropToBackground(crop)) } : undefined;

  return (
    <div
      className={`artwork${revealed ? ' artwork--revealed' : ''}${verdict ? ` artwork--${verdict}` : ''}`}
      role="img"
      aria-label={revealed ? revealedLabel : 'Cropped fragment of an album cover'}
    >
      <div className="artwork__image" style={style} />
      {!crop && !failed && <div className="artwork__skeleton" aria-hidden="true" />}
      {failed && (
        <div className="artwork__error">
          <p>This artwork could not be loaded.</p>
          {onSkip && (
            <button type="button" className="btn btn--ghost" onClick={onSkip}>
              Skip this round
            </button>
          )}
        </div>
      )}
      <span className="artwork__corner artwork__corner--tl" aria-hidden="true" />
      <span className="artwork__corner artwork__corner--tr" aria-hidden="true" />
      <span className="artwork__corner artwork__corner--bl" aria-hidden="true" />
      <span className="artwork__corner artwork__corner--br" aria-hidden="true" />
    </div>
  );
}
