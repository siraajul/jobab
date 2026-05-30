import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import './custom.css';

/**
 * Custom VitePress theme that extends the default. Just adds a stylesheet —
 * no component overrides, so we get every upstream improvement for free.
 */
export default {
  extends: DefaultTheme,
} satisfies Theme;
