import type { ProfileTheme } from '@sharkord/shared';

type TCardThemeProps = {
  profileTheme?: ProfileTheme;
  hasVideoStream?: boolean;
};

const CardTheme = ({
  profileTheme = {
    banner: {
      type: 'solid',
      colors: ['262626']
    }
  },
  hasVideoStream = false
}: TCardThemeProps) => (
  <div
    className="absolute inset-0 pointer-events-none brightness-70"
    style={
      hasVideoStream
        ? { backgroundColor: '#000000' }
        : {
            backgroundImage: `linear-gradient(${profileTheme.banner.colors[0]} 20%, var(--color-accent))`
          }
    }
  />
);

export { CardTheme };
