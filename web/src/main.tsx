import ReactDOM from 'react-dom/client';

import { AppProvider } from '@app/AppProvider';
import '@app/styles/tokens.scss';
import '@app/styles/theme.scss';
import '@app/styles/scrollbar.scss';
import '@app/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<AppProvider />);
