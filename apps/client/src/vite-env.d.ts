/// <reference types="vite/client" />
/// <reference types="zzfx" />

// Extend the Window interface for global functions
declare global {
  interface Window {
    useToken: (token: string) => Promise<void>;
    printVoiceStats?: () => void;
    DEBUG?: boolean;

    // react and react-dom for plugins to use, injected in main.tsx
    __SHARKORD_REACT__: typeof import('react');
    __SHARKORD_REACT_JSX__: typeof import('react/jsx-runtime');
    __SHARKORD_REACT_JSX_DEV__: typeof import('react/jsx-dev-runtime');
    __SHARKORD_REACT_DOM__: typeof import('react-dom');
    __SHARKORD_REACT_DOM_CLIENT__: typeof import('react-dom/client');
  }

  const VITE_APP_VERSION: string;
}

export {};
