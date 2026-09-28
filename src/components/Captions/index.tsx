import { useLanguage } from '@hooks/useLanguage'
import './styles.css'
import type { CaptionsProps } from './types'

export function Captions({ captions }: CaptionsProps) {
  const { t } = useLanguage()
  const finished = captions.filter((caption) => caption.final)
  const inProgress = captions.find((caption) => !caption.final)

  if (captions.length === 0) return null

  return (
    // column-reverse keeps the box scrolled to the newest line, no JavaScript needed.
    <div className="captions">
      <div>
        {/* Screen readers announce each finished line once. */}
        <ol className="captions__list" role="log" aria-label={t('captions.label')}>
          {finished.map((caption, index) => (
            <li key={index} className="caption" data-speaker={caption.speaker}>
              <span className="caption__speaker">{t(`captions.${caption.speaker}`)}</span>
              <p className="caption__text" dir="auto">
                {caption.text}
              </p>
            </li>
          ))}
        </ol>
        {/* The line being spoken right now updates in place; hidden from screen readers
            so they don't read out every new word. */}
        {inProgress && (
          <div
            className="caption caption--live"
            data-speaker={inProgress.speaker}
            aria-hidden="true"
          >
            <span className="caption__speaker">{t(`captions.${inProgress.speaker}`)}</span>
            <p className="caption__text" dir="auto">
              {inProgress.text}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
