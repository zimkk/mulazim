import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { queryClient } from './lib/queryClient'
import { bootstrapAppearance } from './lib/appearance'
import './index.css'

bootstrapAppearance()

/**
 * Quiet credit for anyone who opens the devtools console. Deliberately not
 * surfaced in the UI — Settings → About is the visible attribution.
 */
console.log(
  `%c▍ Mulazim %cv${__APP_VERSION__}\n%cBuilt by zimkk · https://github.com/zimkk/mulazim · MIT`,
  'font-weight:700;font-size:13px;color:#7c7cf7',
  'font-size:11px;color:#9aa2b1',
  'font-size:11px;color:#656d7e',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
