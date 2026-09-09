interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-4 shadow-lg">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded px-4 text-sm text-muted transition-colors hover:bg-subtle"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded bg-danger-600 px-4 text-sm font-medium text-white transition-colors hover:bg-danger-700"
          >
            מחיקה
          </button>
        </div>
      </div>
    </div>
  )
}
