import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SignupAdmin from '../src/components/studentPortal/SignupAdmin'
import './website.css'

createRoot(document.getElementById('root')!).render(<StrictMode><SignupAdmin /></StrictMode>)
