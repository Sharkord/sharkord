import { lazy, memo, Suspense } from 'react';

const Tweet = lazy(() =>
  import('react-tweet').then((m) => ({ default: m.Tweet }))
);

type TTwitterOverrideProps = {
  tweetId: string;
};

const TwitterOverride = memo(({ tweetId }: TTwitterOverrideProps) => {
  return (
    <Suspense fallback={null}>
      <Tweet id={tweetId} />
    </Suspense>
  );
});

export { TwitterOverride };
