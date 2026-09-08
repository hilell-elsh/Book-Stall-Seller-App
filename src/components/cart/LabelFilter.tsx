import type { Label } from '../../types/label'

interface LabelFilterProps {
  labels: Label[]
  activeLabelIds: string[]
  onToggle: (labelId: string) => void
}

export function LabelFilter({ labels, activeLabelIds, onToggle }: LabelFilterProps) {
  if (labels.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-3">
      {labels.map((label) => {
        const active = activeLabelIds.includes(label.id)
        return (
          <button
            key={label.id}
            type="button"
            onClick={() => onToggle(label.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              active
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 text-gray-600'
            }`}
          >
            {label.name}
          </button>
        )
      })}
    </div>
  )
}
