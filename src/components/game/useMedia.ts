import { useSyncExternalStore } from 'react';

/** Live result of a media query; `false` while rendering on the server. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop-like layout: wide screen that isn't a phone lying on its side. */
export const DESKTOP_QUERY = '(min-width: 1024px) and (min-height: 541px)';
