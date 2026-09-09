import { useState } from 'react'
import { SideNav, type TabId } from './components/SideNav'
import { useCartState } from './hooks/useCartState'
import { ConfigPage } from './pages/ConfigPage/ConfigPage'
import { RecordsPage } from './pages/RecordsPage/RecordsPage'
import { SalePage } from './pages/SalePage'

function App() {
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
