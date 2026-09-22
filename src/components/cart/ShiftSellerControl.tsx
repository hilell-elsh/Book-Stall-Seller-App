import type { Creator } from '../../types/creator'

interface ShiftSellerControlProps {
  creators: Creator[]
  creatorId: string
  onChange: (creatorId: string) => void
  onClear: () => void
}

// Lets whoever's holding this device set/clear who's on shift, purely as a
// convenience default for the receiver field below — never itself synced or
// treated as identity (see domain/shiftSeller.ts).
export function ShiftSellerControl({ creators, creatorId, onChange, onClear }: ShiftSellerControlProps) {
  if (creators.length === 0) return null

  return (
    <div className="p-3">
      <label className="block text-sm text-muted">מי מוכר/ת עכשיו</label>
      <select
        value={creatorId}
        onChange={(e) => (e.target.value ? onChange(e.target.value) : onClear())}
        className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
      >
        <option value="">לא נבחר</option>
        {creators.map((creator) => (
          <option key={creator.id} value={creator.id}>
            {creator.name}
          </option>
        ))}
      </select>
    </div>
  )
}
