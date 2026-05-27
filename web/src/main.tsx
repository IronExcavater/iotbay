import '@fontsource-variable/inter/wght.css'
import ReactDOM from 'react-dom/client'

import { AppProvider } from '@app/AppProvider'
import '@app/styles/tokens.scss'
import '@app/styles/theme.scss'
import '@app/styles/scrollbar.scss'
import '@app/styles/index.css'
import { DemoProvider } from './demo/DemoContext'
import { DemoLoadingScreen } from './demo/DemoLoadingScreen'

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const root = document.getElementById('root')!

if (isDemoMode) {
    ReactDOM.createRoot(root).render(
        <DemoProvider>
            <DemoLoadingScreen />
            <AppProvider />
        </DemoProvider>
    )
} else {
    ReactDOM.createRoot(root).render(<AppProvider />)
}
