import { isSyncConfigured } from '../sync/firebaseConfig'
import { useSyncStatus } from '../sync/syncStatus'

// Minimal always-visible indicator (Phase 2 Task 15's plan), rendered in the
// app shell regardless of which tab is active. Full detail (last-synced-at,
// manual sync, stuck-op errors) lives in Settings' SyncStatusPanel.
export function SyncStatusBadge() {
  const status = useSyncStatus()
  if (!isSyncConfigured) return null

  const { dotColor, label } = describeStatus(status)

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted" title={label}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
      {label}
    </span>
  )
}

function describeStatus(status: ReturnType<typeof useSyncStatus>): { dotColor: string; label: string } {
  if (!status.online) return { dotColor: 'bg-line-strong', label: 'לא מחובר' }
  if (status.stuckOps.length > 0) return { dotColor: 'bg-danger-600', label: 'בעיית סנכרון' }
  if (status.pendingCount > 0) return { dotColor: 'bg-accent-600', label: `מסנכרן… (${status.pendingCount})` }
  return { dotColor: 'bg-success-600', label: 'מסונכרן' }
}
