import { useState } from 'react'
import { NavTabs, type TabId } from './components/NavTabs'
import { ConfigPage } from './pages/ConfigPage/ConfigPage'
import { RecordsPage } from './pages/RecordsPage'
import { SalePage } from './pages/SalePage'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('sale')

  return (
    <div className="min-h-full bg-gray-50">
      <NavTabs active={activeTab} onChange={setActiveTab} />
      {activeTab === 'sale' && <SalePage />}
      {activeTab === 'config' && <ConfigPage />}
      {activeTab === 'records' && <RecordsPage />}
    </div>
  )
}

export default App
