import { Toaster } from '@/components/ui/sonner';
import 'prosemirror-view/style/prosemirror.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { DebugInfo } from './components/debug-info/index.tsx';
import { StoreDebug } from './components/debug/store-debug.tsx';
import { DevicesProvider } from './components/devices-provider/index.tsx';
import { DialogsProvider } from './components/dialogs/index.tsx';
import { LanguageProvider } from './components/language-provider/index.tsx';
import { Routing } from './components/routing/index.tsx';
import { ServerScreensProvider } from './components/server-screens/index.tsx';
import { ThemeProvider } from './components/theme-provider/index.tsx';
import { store } from './features/store.ts';
import { LocalStorageKey } from './helpers/storage.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider
        defaultTheme="dark"
        storageKey={LocalStorageKey.VITE_UI_THEME}
      >
        <DebugInfo />
        <Toaster />
        <Provider store={store}>
          <StoreDebug />
          <DevicesProvider>
            <DialogsProvider />
            <ServerScreensProvider />
            <Routing />
          </DevicesProvider>
        </Provider>
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>
);
