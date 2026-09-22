import { useState } from 'react'
import { SideNav, type TabId } from './components/SideNav'
import { useCartState } from './hooks/useCartState'
import { ConfigPage } from './pages/ConfigPage/ConfigPage'
import { RecordsPage } from './pages/RecordsPage/RecordsPage'
import { SalePage } from './pages/SalePage'

function App() {
  // Deliberate, permanent test hook for the browser-repro skill (see
  // .claude/skills/browser-repro) — lets it verify the ErrorBoundary
  // fallback actually renders instead of the tree going blank, without
  // needing a real bug to trigger. Requires an exact, unguessable query
  // param; harmless if a real user ever typed it (reload recovers).
  if (new URLSearchParams(location.search).get('crashtest')) {
    throw new Error('forced crash for verification (see browser-repro skill)')
  }
  const [activeTab, setActiveTab] = useState<TabId>('sale')
  // Lives here (above the tab switch) so the in-progress sale survives navigating away and back.
  const cart = useCartState()

  return (
    <div className="flex min-h-dvh flex-col bg-paper sm:flex-row">
      <SideNav active={activeTab} onChange={setActiveTab} />
      <main className="min-w-0 flex-1">
        {activeTab === 'sale' && <SalePage cart={cart} />}
        {activeTab === 'config' && <ConfigPage />}
        {activeTab === 'records' && <RecordsPage />}
      </main>
    </div>
  )
}

export default App
