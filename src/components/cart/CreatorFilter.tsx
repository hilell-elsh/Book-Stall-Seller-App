import type { Creator } from '../../types/creator'

interface CreatorFilterProps {
  creators: Creator[]
  activeCreatorIds: string[]
  onToggle: (creatorId: string) => void
}

export function CreatorFilter({ creators, activeCreatorIds, onToggle }: CreatorFilterProps) {
  if (creators.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-3">
      {creators.map((creator) => {
        const active = activeCreatorIds.includes(creator.id)
        return (
          <button
            key={creator.id}
            type="button"
            onClick={() => onToggle(creator.id)}
            className={`flex min-h-9 items-center justify-center rounded-full border px-3 text-xs font-medium ${
              active
                ? 'border-accent-600 bg-accent-600 text-white'
                : 'border-line-strong text-muted transition-colors hover:bg-subtle'
            }`}
          >
            {creator.name}
          </button>
        )
      })}
    </div>
  )
}
