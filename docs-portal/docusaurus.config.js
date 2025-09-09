import { themes as prismThemes } from 'prism-react-renderer';

export default {
  title: 'SaaS Platform Docs',
  tagline: 'Integration guides and API reference',
  url: 'https://example.com',
  // Serve documentation from /docs so the app link works without 404s
  baseUrl: '/docs/',
  favicon: 'img/favicon.ico',
  organizationName: 'saas-platform',
  projectName: 'docs',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
  },
  themeConfig: {
    navbar: {
      title: 'SaaS Docs',
      items: [
        { type: 'docSidebar', sidebarId: 'defaultSidebar', position: 'left', label: 'Docs' },
        { type: 'docsVersionDropdown', position: 'right' },
        { href: 'https://github.com/', label: 'GitHub', position: 'right' }
      ],
    },
    prism: {
      theme: prismThemes.github,
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/your-org/saas-framework/tree/main/docs-portal/',
          showLastUpdateTime: true,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
