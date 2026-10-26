export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'jobab-theme';
const THEME_EVENT = 'jobab:theme-changed';

export function normalizeTheme(value: string | null): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

export function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
}

export function getServerThemeSnapshot(): Theme {
  return 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(`theme-${theme}`);
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme switching still works when the browser blocks persistent storage.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeToTheme(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    applyTheme(normalizeTheme(event.newValue));
    onChange();
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

// The local preference is unknown to SSR. Only <html>'s theme class changes
// before hydration; the rest of the document retains its server attributes.
export const THEME_BOOT_SCRIPT = `(function(){var t='light';try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='dark')t='dark';}catch(e){}var h=document.documentElement;h.classList.remove('theme-light','theme-dark');h.classList.add('theme-'+t);})();`;
