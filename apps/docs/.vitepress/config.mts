import { defineConfig } from 'vitepress';
import { resolve } from 'node:path';

// Vue + VitePress live in apps/docs/node_modules, but Vite resolves modules
// walking up from `srcDir` (= the repo's /docs folder), which doesn't see
// our workspace's node_modules. Forcing resolution back here fixes the
// "Rollup failed to resolve import 'vue/server-renderer'" build error.
const DOCS_NODE_MODULES = resolve(__dirname, '../node_modules');

/**
 * VitePress config for the Jobab docs book.
 *
 * Source: the markdown files in `/docs` at the repo root. We point
 * `srcDir` there so the existing folder structure (start-here / build /
 * ship / legal) is the source of truth. GitHub still renders the same
 * files natively in the repo browser — VitePress just gives them a
 * sidebar, search, and dark mode.
 *
 * Base path is `/jobab/` because GitHub Pages serves at
 * `https://siraajul.github.io/jobab/`. If you later move to a custom
 * domain like `docs.jobab.com`, change `base` to `/`.
 */
export default defineConfig({
  title: 'Jobab',
  description: 'AI sales agent for Bangladeshi social-commerce merchants',
  lang: 'en-US',

  // Tell VitePress the markdown lives outside apps/docs/.
  srcDir: resolve(__dirname, '../../../docs'),

  // Build artifacts go inside apps/docs/.vitepress/dist (default), then
  // the GitHub Action picks them up.
  outDir: resolve(__dirname, '../dist'),

  // GitHub Pages path. Change to '/' for a custom domain.
  base: '/jobab/',

  // Don't fail the build on a single dead link — list them at the end.
  ignoreDeadLinks: 'localhostLinks',

  // README.md files inside subfolders should serve as that folder's index
  // (so links like `[x](./ship/pilot/)` work in the VitePress site AND
  //  GitHub keeps auto-rendering README.md when you browse the folder).
  rewrites: {
    // The top-level docs/README.md is the site homepage.
    'README.md': 'index.md',
    // Folder READMEs serve as that folder's index page.
    'ship/app-review/README.md': 'ship/app-review/index.md',
    'ship/pilot/README.md': 'ship/pilot/index.md',
  },

  vite: {
    resolve: {
      // srcDir is /docs (outside this workspace), so Vite's default resolution
      // doesn't see apps/docs/node_modules. Point vue + vue/server-renderer
      // at the absolute path here.
      alias: [
        {
          find: /^vue$/,
          replacement: resolve(DOCS_NODE_MODULES, 'vue/dist/vue.runtime.esm-bundler.js'),
        },
        {
          find: /^vue\/server-renderer$/,
          replacement: resolve(DOCS_NODE_MODULES, 'vue/server-renderer/index.mjs'),
        },
      ],
    },
  },

  // Default light, with toggle.
  appearance: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/jobab/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#1F6E47' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Jobab — AI sales agent for Bangladeshi merchants' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'AI that replies to customer DMs in Bangla, takes orders, generates bKash links — built for shops that sell on Facebook, Instagram, and WhatsApp.',
      },
    ],
    ['meta', { property: 'og:image', content: '/jobab/favicon.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],

  themeConfig: {
    siteTitle: 'Jobab',
    logo: { src: '/logo.svg', alt: 'Jobab' },

    // Top nav — keep tight so the sidebar does the navigating.
    nav: [
      { text: 'Start here', link: '/start-here/1-what-is-jobab' },
      { text: 'Build', link: '/build/1-setup' },
      { text: 'Ship', link: '/ship/1-channel-plan' },
      { text: 'Status', link: '/status' },
      { text: 'GitHub', link: 'https://github.com/siraajul/jobab' },
    ],

    // One unified sidebar shown on every page. Each section is collapsible
    // so you can jump from any page to any other without going back home.
    sidebar: [
      {
        text: 'Start here',
        collapsed: false,
        items: [
          { text: 'What is Jobab?', link: '/start-here/1-what-is-jobab' },
          { text: 'How it works', link: '/start-here/2-how-it-works' },
          { text: "Meta's rules, in plain English", link: '/start-here/3-meta-rules-simple' },
        ],
      },
      {
        text: 'Build',
        collapsed: false,
        items: [
          { text: 'Local setup', link: '/build/1-setup' },
          { text: 'API guide', link: '/build/2-api-guide' },
          { text: 'Tech stack', link: '/build/3-tech-stack' },
          {
            text: 'Architecture decisions',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/build/decisions/' },
              { text: '0001 — pnpm monorepo', link: '/build/decisions/0001-monorepo-pnpm' },
              {
                text: '0002 — LLM provider interface',
                link: '/build/decisions/0002-llm-provider-interface',
              },
              { text: '0003 — order guardrail', link: '/build/decisions/0003-order-guardrail' },
              {
                text: '0004 — RBAC / comments / mobile',
                link: '/build/decisions/0004-phase2-rbac-comments-mobile',
              },
            ],
          },
        ],
      },
      {
        text: 'Ship',
        collapsed: false,
        items: [
          { text: 'Channel plan', link: '/ship/1-channel-plan' },
          { text: 'Meta setup, step by step', link: '/ship/2-meta-setup' },
          {
            text: 'App Review submission',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/ship/app-review/' },
              { text: 'Use-case copy', link: '/ship/app-review/use-case' },
              { text: 'Screencast script', link: '/ship/app-review/screencast-script' },
              { text: 'Test credentials', link: '/ship/app-review/test-credentials' },
            ],
          },
          {
            text: 'Pilot launch',
            collapsed: true,
            items: [
              { text: 'Overview', link: '/ship/pilot/' },
              { text: 'Pilot plan', link: '/ship/pilot/pilot-plan' },
              { text: 'Outreach', link: '/ship/pilot/pilot-outreach' },
              { text: 'Interview script', link: '/ship/pilot/interview-script' },
              { text: 'Merchant consent', link: '/ship/pilot/merchant-consent' },
              { text: 'Weekly check-in', link: '/ship/pilot/weekly-checkin' },
            ],
          },
        ],
      },
      {
        text: 'Legal',
        collapsed: true,
        items: [
          { text: 'Privacy policy', link: '/legal/privacy-policy' },
          { text: 'Data deletion', link: '/legal/data-deletion' },
        ],
      },
      {
        text: 'Project',
        collapsed: true,
        items: [{ text: 'Status', link: '/status' }],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/siraajul/jobab' }],

    // "Edit this page" footer links each rendered page back to its
    // raw markdown source on GitHub.
    editLink: {
      pattern: 'https://github.com/siraajul/jobab/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'MIT licensed',
      copyright: 'Built by the Jobab team for Bangladeshi merchants',
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },
  },
});
