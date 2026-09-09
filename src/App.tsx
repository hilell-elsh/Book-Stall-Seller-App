import { useState } from 'react'
import { NavTabs, type TabId } from './components/NavTabs'
import { useCartState } from './hooks/useCartState'
import { ConfigPage } from './pages/ConfigPage/ConfigPage'
import { RecordsPage } from './pages/RecordsPage/RecordsPage'
import { SalePage } from './pages/SalePage'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('sale')
  // Lives here (above the tab switch) so the in-progress sale survives navigating away and back.
  const cart = useCartState()

  return (
    <div className="min-h-full bg-paper">
      <NavTabs active={activeTab} onChange={setActiveTab} />
      {activeTab === 'sale' && <SalePage cart={cart} />}
      {activeTab === 'config' && <ConfigPage />}
      {activeTab === 'records' && <RecordsPage />}
    </div>
  )
}

export default App
