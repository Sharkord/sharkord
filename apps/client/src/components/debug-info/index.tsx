import { useStrictEffect } from '@/hooks/use-strict-effect';
import { memo } from 'react';

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
