import { Toaster } from '@sharkord/ui';
import 'prosemirror-view/style/prosemirror.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { DebugInfo } from './components/debug-info/index.tsx';
import { StoreDebug } from './components/debug/store-debug.tsx';
import { DevicesProvider } from './components/devices-provider/index.tsx';
import { DialogsProvider } from './components/dialogs/index.tsx';
import { PluginsController } from './components/plugins-controller/index.tsx';
import { Routing } from './components/routing/index.tsx';
import { ServerScreensProvider } from './components/server-screens/index.tsx';
import { ThemeProvider } from './components/theme-provider/index.tsx';
import { store } from './features/store.ts';
import { LocalStorageKey } from './helpers/storage.ts';
import './index.css';

// import react and react-dom to the window object for plugins to use
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactJSXDev from 'react/jsx-dev-runtime';
import * as ReactJSX from 'react/jsx-runtime';

// exposes React and ReactDOM to the window object for plugins to use
window.__SHARKORD_REACT__ = React;
window.__SHARKORD_REACT_JSX__ = ReactJSX;
window.__SHARKORD_REACT_JSX_DEV__ = ReactJSXDev;
window.__SHARKORD_REACT_DOM__ = ReactDOM;
window.__SHARKORD_REACT_DOM_CLIENT__ = ReactDOMClient;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      defaultTheme="dark"
      storageKey={LocalStorageKey.VITE_UI_THEME}
    >
      <DebugInfo />
      <Toaster />
      <Provider store={store}>
        <StoreDebug />
        <DevicesProvider>
          <PluginsController />
          <DialogsProvider />
          <ServerScreensProvider />
          <Routing />
        </DevicesProvider>
      </Provider>
    </ThemeProvider>
  </StrictMode>
);
