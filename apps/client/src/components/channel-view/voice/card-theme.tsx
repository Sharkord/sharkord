import { DEFAULT_PROFILE_COLOR } from '@sharkord/shared';
import { memo, useMemo } from 'react';

type TCardThemeProps = {
  profileColor?: string;
  hasVideoStream?: boolean;
};

const CardTheme = memo(
  ({
    profileColor = DEFAULT_PROFILE_COLOR,
    hasVideoStream = false
  }: TCardThemeProps) => {
    const style = useMemo(
      () =>
        hasVideoStream
          ? { backgroundColor: '#000000' }
          : {
              backgroundImage: `linear-gradient(${profileColor} 20%, var(--color-accent))`
            },
      [profileColor, hasVideoStream]
    );

    return (
      <div
        className="absolute inset-0 pointer-events-none brightness-70"
        style={style}
      />
    );
  }
);

CardTheme.displayName = 'CardTheme';

export { CardTheme };
