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
    <nav className="sticky top-0 z-10 flex border-b border-gray-200 bg-white">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-3 text-base font-medium ${
            active === tab.id
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
