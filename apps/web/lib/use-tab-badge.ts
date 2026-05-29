'use client';

import { useEffect } from 'react';

/**
 * Updates `document.title` with a leading "(N)" badge whenever there are
 * conversations needing the merchant's attention. Resets the title when the
 * tab is focused — your eyes are already on it.
 */
export function useTabBadge(needsCount: number, baseTitle = 'Jobab Inbox') {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = () => {
      if (needsCount > 0 && document.visibilityState !== 'visible') {
        document.title = `(${needsCount}) ${baseTitle}`;
      } else {
        document.title = baseTitle;
      }
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      document.title = baseTitle;
    };
  }, [needsCount, baseTitle]);
}
