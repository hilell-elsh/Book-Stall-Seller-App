import { useState, type ReactNode } from 'react'
import { isSyncConfigured } from '../sync/firebaseConfig'
import { SyncStatusBadge } from './SyncStatusBadge'

export type TabId = 'sale' | 'config' | 'records'

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'sale', label: 'מכירה', icon: <CartIcon /> },
  { id: 'config', label: 'הגדרות', icon: <GearIcon /> },
  { id: 'records', label: 'רשומות', icon: <ReceiptIcon /> },
]

interface SideNavProps {
  active: TabId
  onChange: (tab: TabId) => void
}

function NavButton({
  tab,
  isActive,
  onClick,
}: {
  tab: (typeof TABS)[number]
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive ? 'bg-accent-600 text-white' : 'text-muted hover:bg-subtle'
      }`}
    >
      {tab.icon}
      {tab.label}
    </button>
  )
}

export function SideNav({ active, onChange }: SideNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeLabel = TABS.find((tab) => tab.id === active)?.label ?? ''

  function handleSelect(id: TabId) {
    onChange(id)
    setMobileOpen(false)
  }

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface p-3 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="פתח תפריט"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded transition-colors hover:bg-subtle"
        >
          <MenuIcon />
        </button>
        <span className="text-base font-semibold">{activeLabel}</span>
        {isSyncConfigured && (
          <span className="ms-auto">
            <SyncStatusBadge />
          </span>
        )}
      </div>

      <nav className="hidden shrink-0 flex-col gap-1 border-e border-line bg-surface p-3 sm:flex sm:w-52">
        {TABS.map((tab) => (
          <NavButton
            key={tab.id}
            tab={tab}
            isActive={active === tab.id}
            onClick={() => handleSelect(tab.id)}
          />
        ))}
        {isSyncConfigured && (
          <div className="mt-auto border-t border-line pt-2">
            <SyncStatusBadge />
          </div>
        )}
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 sm:hidden">
          <button
            type="button"
            aria-label="סגירת תפריט"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute inset-y-0 end-0 flex w-64 flex-col gap-1 bg-surface p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-base font-semibold">תפריט</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="סגירה"
                className="flex h-11 w-11 items-center justify-center rounded transition-colors hover:bg-subtle"
              >
                <XIcon />
              </button>
            </div>
            {TABS.map((tab) => (
              <NavButton
                key={tab.id}
                tab={tab}
                isActive={active === tab.id}
                onClick={() => handleSelect(tab.id)}
              />
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
