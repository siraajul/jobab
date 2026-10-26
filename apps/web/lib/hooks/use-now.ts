'use client';

import { useSyncExternalStore } from 'react';

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
const snapshot = () => now;
const serverSnapshot = () => 0;
function tick() {
  now = Date.now();
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    tick();
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
      now = 0;
    }
  };
}

/** One shared clock; SSR and the first hydration render use the same snapshot. */
export function useNow() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
