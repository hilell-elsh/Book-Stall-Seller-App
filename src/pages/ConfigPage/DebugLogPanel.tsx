import { useState } from 'react'
import { clearDebugLog, formatDebugLogForSharing, useDebugLog } from '../../debug/errorLog'

// Lets a non-technical seller hand over what actually happened instead of
// describing "it just doesn't work" — captures console.error/warn plus
// otherwise-invisible failures (an event-handler exception shows nothing on
// screen, see the crypto.randomUUID incident) into a small local log.
export function DebugLogPanel() {
  const log = useDebugLog()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [showManualCopy, setShowManualCopy] = useState(false)

  const text = formatDebugLogForSharing(log)

  async function handleCopy() {
    // navigator.clipboard is restricted to secure contexts (https://,
    // localhost) — unavailable over plain http:// to a LAN IP, exactly how
    // this app gets tested. Fall back to a manual select-and-copy textarea.
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        setCopyState('copied')
        setTimeout(() => setCopyState('idle'), 2000)
        return
      } catch {
        // fall through to manual copy
      }
    }
    setCopyState('manual')
    setShowManualCopy(true)
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">יומן ניפוי</h2>
      <p className="mt-1 text-sm text-faint">
        {log.length === 0 ? 'היומן ריק.' : `${log.length} רשומות. אפשר להעתיק ולשלוח לצורך בדיקה.`}
      </p>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={log.length === 0}
          className="rounded border border-line-strong px-3 py-2 text-sm font-medium hover:bg-subtle disabled:opacity-50"
        >
          {copyState === 'copied' ? 'הועתק!' : 'העתקת יומן'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearDebugLog()
            setShowManualCopy(false)
            setCopyState('idle')
          }}
          disabled={log.length === 0}
          className="rounded border border-line-strong px-3 py-2 text-sm font-medium hover:bg-subtle disabled:opacity-50"
        >
          ניקוי יומן
        </button>
      </div>

      {showManualCopy && (
        <div className="mt-2">
          <p className="text-sm text-faint">ההעתקה האוטומטית לא זמינה כאן. יש לבחור הכל ולהעתיק ידנית:</p>
          <textarea
            readOnly
            value={text}
            onFocus={(e) => e.target.select()}
            className="mt-1 h-32 w-full rounded border border-line-strong p-2 text-left text-xs"
            dir="ltr"
          />
        </div>
      )}
    </section>
  )
}
