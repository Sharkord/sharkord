import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { i18nReady } from './i18n';
import './index.css';

await i18nReady;

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
