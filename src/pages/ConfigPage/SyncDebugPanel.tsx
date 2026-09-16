import { useState } from 'react'
import * as store from '../../data/store'
import { isSyncConfigured } from '../../sync/firebaseConfig'
import { pullAll, pushAll } from '../../sync/backend'

// Task 11's one-off manual verification action: push every local row to
// Firestore, then read it back and compare counts, so this stall can confirm
// its data landed correctly without leaving the app. Not the real sync
// engine — that's the outbox/drain loop built in Tasks 12-14, which will
// replace this panel with the sync-status UI from Task 15. eventName is
// deliberately not pushed here: unlike the other 7 entities it has no
// id/updatedAt yet (needed for it to sync as a shared scalar), which is
// separate follow-up work flagged in the Phase 2 plan, not part of Task 11.
const ENTITIES: { key: string; label: string; getRows: () => { id: string }[] }[] = [
  { key: 'categories', label: 'קטגוריות', getRows: store.getCategories },
  { key: 'items', label: 'פריטים', getRows: store.getItems },
  { key: 'discountRules', label: 'מבצעים', getRows: store.getDiscountRules },
  { key: 'labels', label: 'תוויות', getRows: store.getLabels },
  { key: 'paymentMethods', label: 'אמצעי תשלום', getRows: store.getPaymentMethods },
  { key: 'creators', label: 'יוצרים', getRows: store.getCreators },
  { key: 'saleRecords', label: 'מכירות', getRows: store.getSaleRecords },
]

type RowResult = { label: string; pushed: number; verified: number }

export function SyncDebugPanel() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<RowResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isSyncConfigured) return null

  async function runUpload() {
    setRunning(true)
    setError(null)
    setResults(null)
    try {
      const next: RowResult[] = []
      for (const entity of ENTITIES) {
        const rows = entity.getRows()
        await pushAll(entity.key, rows)
        const readBack = await pullAll(entity.key)
        next.push({ label: entity.label, pushed: rows.length, verified: readBack.length })
      }
      setResults(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההעלאה נכשלה')
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">סנכרון (בטא)</h2>
      <p className="mt-1 text-sm text-faint">
        פעולת בדיקה חד-פעמית: מעלה את כל הנתונים המקומיים לענן ומוודא שהם נקלטו.
      </p>
      <button
        type="button"
        onClick={runUpload}
        disabled={running}
        className="mt-2 rounded border border-line-strong px-3 py-2 text-sm font-medium hover:bg-subtle disabled:opacity-50"
      >
        {running ? 'מעלה…' : 'העלה את כל הנתונים לענן'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {results && (
        <ul className="mt-2 space-y-0.5 text-sm text-faint">
          {results.map((result) => (
            <li key={result.label}>
              {result.label}: {result.pushed} הועלו, {result.verified} אומתו בענן
              {result.pushed !== result.verified && ' ⚠️'}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
