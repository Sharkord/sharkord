import { useFreezeAnimatedAvatars } from '@/features/app/hooks';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { FrozenImage } from '../frozen-image';

type TUserBannerProps = {
  src: string;
  className?: string;
};

const UserBanner = memo(({ src, className }: TUserBannerProps) => {
  const freezeAnimatedAvatars = useFreezeAnimatedAvatars();

  const style = useMemo(() => ({ backgroundImage: `url("${src}")` }), [src]);

  return (
    <div className={cn('group/banner relative overflow-hidden', className)}>
      <div
        className={cn(
          'size-full bg-cover bg-center bg-no-repeat',
          freezeAnimatedAvatars && 'invisible group-hover/banner:visible'
        )}
        style={style}
      />
      {freezeAnimatedAvatars && (
        <FrozenImage
          src={src}
          className="absolute inset-0 size-full object-cover group-hover/banner:invisible"
        />
      )}
    </div>
  );
});

UserBanner.displayName = 'UserBanner';

export { UserBanner };
