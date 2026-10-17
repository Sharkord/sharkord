import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PerformanceOverlay } from './performance-overlay';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <PerformanceOverlay />
  </StrictMode>
);
