export type TabId = 'sale' | 'config' | 'records'

const TABS: { id: TabId; label: string }[] = [
  { id: 'sale', label: 'מכירה' },
  { id: 'config', label: 'הגדרות' },
  { id: 'records', label: 'רשומות' },
]

interface NavTabsProps {
  active: TabId
  onChange: (tab: TabId) => void
}

export function NavTabs({ active, onChange }: NavTabsProps) {
  return (
    <nav className="sticky top-0 z-10 flex border-b border-line bg-surface">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-3 text-base font-medium ${
            active === tab.id
              ? 'border-b-2 border-accent-600 text-accent-600'
              : 'text-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
