import { useEffect, useRef } from 'react';

type TAutoFocusProps = {
  skip?: boolean;
  children: React.ReactNode;
};

export function AutoFocus({ children, skip = false }: TAutoFocusProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && !skip) {
      let focusable: HTMLInputElement | null | undefined =
        ref.current?.querySelector<HTMLInputElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

      if (!focusable) {
        focusable = ref.current?.parentNode?.querySelector<HTMLInputElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
      }

      if (focusable) {
        focusable.focus?.();

        setTimeout(() => {
          if (document.activeElement !== focusable && focusable) {
            focusable.focus?.();
          }
        }, 0);
      }
    }
  }, [skip]);

  return (
    <div style={{ display: 'contents' }} ref={ref}>
      {children}
    </div>
  );
}
