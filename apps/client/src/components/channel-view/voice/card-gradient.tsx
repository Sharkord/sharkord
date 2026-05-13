type TCardGradientProps = {
  bannerColor?: string | null;
  hasVideoStream?: boolean;
};

const CardGradient = ({
  bannerColor = '#000000',
  hasVideoStream = false
}: TCardGradientProps) => (
  <div
    className="absolute inset-0 pointer-events-none brightness-70"
    style={
      hasVideoStream
        ? { backgroundColor: '#000000' }
        : {
            backgroundImage: `radial-gradient(circle at bottom, ${bannerColor || '#000000'} 20%, var(--color-accent))`
          }
    }
  />
);

export { CardGradient };
