import { drainOutbox } from '../../sync/drain'
import { isSyncConfigured } from '../../sync/firebaseConfig'
import { useSyncStatus } from '../../sync/syncStatus'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Task 15's real sync-status UI — replaces Task 11's one-off SyncDebugPanel.
export function SyncStatusPanel() {
  const status = useSyncStatus()
  if (!isSyncConfigured) return null

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">סנכרון</h2>

      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-faint">סטטוס חיבור</dt>
          <dd className={status.online ? 'text-success-600' : 'text-faint'}>
            {status.online ? 'מחובר' : 'לא מחובר'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-faint">שינויים ממתינים</dt>
          <dd>{status.pendingCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-faint">סנכרון אחרון</dt>
          <dd>{status.lastSyncedAt ? formatTimestamp(status.lastSyncedAt) : 'טרם סונכרן'}</dd>
        </div>
      </dl>

      {status.stuckOps.length > 0 && (
        <div className="mt-3 rounded border border-danger-300 bg-danger-300/20 p-2 text-sm text-danger-700">
          <p className="font-medium">{status.stuckOps.length} שינויים לא הצליחו להסתנכרן</p>
          <ul className="mt-1 space-y-0.5">
            {status.stuckOps.map((op) => (
              <li key={op.opId}>
                {op.entity}: {op.lastError ?? 'שגיאה לא ידועה'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => void drainOutbox()}
        disabled={status.draining}
        className="mt-3 rounded border border-line-strong px-3 py-2 text-sm font-medium hover:bg-subtle disabled:opacity-50"
      >
        {status.draining ? 'מסנכרן…' : 'סנכרן עכשיו'}
      </button>
    </section>
  )
}
