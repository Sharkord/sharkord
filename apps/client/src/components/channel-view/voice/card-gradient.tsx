type TCardGradientProps = {
  bannerColor?: string | null;
};

const CardGradient = ({ bannerColor = '#000000' }: TCardGradientProps) => (
  <div
    className="absolute inset-0 pointer-events-none brightness-70"
    style={{
      backgroundImage: `linear-gradient(to top, ${bannerColor || '#000000'}, var(--color-accent))`
    }}
  />
);

export { CardGradient };
