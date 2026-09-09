import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './website.css'
import WebsiteView from '../src/components/WebsiteView'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="min-h-screen bg-neutral-50 p-4 text-neutral-900">
      <WebsiteView />
    </main>
  </StrictMode>,
)
