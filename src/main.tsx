import { createRoot } from 'react-dom/client'
import { migrateLegacy } from './data/save'
import App from './ui/App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import './ui/theme.css'

// Antes de montar o menu: move o save único antigo para o slot 0, se existir.
migrateLegacy()
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>)
