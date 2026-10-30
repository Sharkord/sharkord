import { getDesktopApi } from '@/helpers/desktop-api';
import { useStrictEffect } from '@/hooks/use-strict-effect';
import { DESKTOP_BRIDGE_VERSION, getDesktopMismatch } from '@sharkord/shared';
import { memo } from 'react';

const getDesktopStatus = () => {
  const entry = window.sharkordDesktop;

  if (!entry) {
    return 'not running in the desktop app';
  }

  if (getDesktopApi()) {
    return `connected, desktop features available (bridge v${DESKTOP_BRIDGE_VERSION})`;
  }

  const mismatch = getDesktopMismatch(entry.version, DESKTOP_BRIDGE_VERSION);

  return `not connected (${mismatch ?? 'refused'}), desktop features unavailable (app bridge v${entry.version}, client bridge v${DESKTOP_BRIDGE_VERSION})`;
};

const DebugInfo = memo(() => {
  useStrictEffect(() => {
    console.log(
      '%cSHARKORD',
      'font-size: 64px; font-weight: bold; background: linear-gradient(90deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'
    );
    console.log(
      '%cVersion: %s',
      'font-size: 16px; font-weight: bold;',
      VITE_APP_VERSION
    );
    console.log(
      '%cEnvironment: %s',
      'font-size: 16px; font-weight: bold;',
      import.meta.env.MODE
    );
    console.log(
      '%cDesktop app: %s',
      'font-size: 16px; font-weight: bold;',
      getDesktopStatus()
    );
    console.log(
      '%cThis is a open source project, feel free to contribute: https://github.com/Sharkord/sharkord',
      'font-size: 12px; font-weight: bold;'
    );
    console.log(
      '%cDO NOT PASTE ANY CODE HERE, THIS IS A BROWSER TOOL INTENDED FOR DEVELOPERS ONLY. IF SOMEONE TOLD YOU TO COPY-PASTE SOMETHING HERE, IT IS A SCAM AND THEY ARE TRYING TO STEAL YOUR ACCOUNT!',
      'font-size: 12px; font-weight: bold; color: red; background: yellow; padding: 10px;'
    );
  }, []);

  return null;
});

export { DebugInfo };
