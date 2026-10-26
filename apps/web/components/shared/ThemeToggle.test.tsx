import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

describe('theme initialization and switching', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.className = '';
    jest.restoreAllMocks();
  });

  it.each(['light', 'dark', 'invalid'])(
    'initializes %s without changing body attributes',
    (saved) => {
      localStorage.setItem('jobab-theme', saved);
      const bodyClass = document.body.className;
      window.eval(THEME_BOOT_SCRIPT);
      render(<ThemeToggle />);
      const expected = saved === 'dark' ? 'dark' : 'light';
      expect(document.documentElement).toHaveClass(`theme-${expected}`);
      expect(document.body.className).toBe(bodyClass);
      expect(
        screen.getByRole('button', {
          name: `Switch to ${expected === 'dark' ? 'light' : 'dark'} theme`,
        }),
      ).toBeVisible();
    },
  );

  it('switches themes even when browser storage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    window.eval(THEME_BOOT_SCRIPT);
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement).toHaveClass('theme-dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  });
});
