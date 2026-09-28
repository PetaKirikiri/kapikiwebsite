import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './website.css'
import WebsiteView from '../src/components/WebsiteView'

if (!window.location.hash) history.replaceState(null, '', '#moe')

createRoot(document.getElementById('root')!).render(
  <StrictMode><div className="min-h-screen bg-neutral-50 p-4 text-neutral-900"><WebsiteView intakeVersion={1} /></div></StrictMode>,
)
