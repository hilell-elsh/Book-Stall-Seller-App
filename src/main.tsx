import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppDataProvider } from './context/AppDataContext.tsx'
import { seedDemoDataIfEmpty } from './dev/demoData.ts'

if (import.meta.env.VITE_SEED_DEMO === 'true') {
  seedDemoDataIfEmpty()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider>
      <App />
    </AppDataProvider>
  </StrictMode>,
)
