/// <reference types="vite/client" />
/// <reference types="zzfx" />

// Extend the Window interface for global functions
declare global {
  interface Window {
    useToken: (token: string) => Promise<void>;
    printVoiceStats?: () => void;
    DEBUG?: boolean;
  }

  const VITE_APP_VERSION: string;
}

export {};
