const { themes: prismThemes } = require('prism-react-renderer');

module.exports = {
  title: 'SaaS Platform Docs',
  tagline: 'Integration guides and API reference',
  url: 'https://example.com',
  // Serve the documentation from / so it's immediately visible when the portal loads
  baseUrl: '/',
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
      style: 'primary',
      title: 'SaaS Docs',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'defaultSidebar',
          position: 'left',
          label: 'Docs',
        },
        { type: 'docsVersionDropdown', position: 'right' },
        { href: 'https://github.com/', label: 'GitHub', position: 'right' }
      ],
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    footer: {
      style: 'dark',
      copyright: `\u00A9 ${new Date().getFullYear()} SaaS Platform`,
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/your-org/saas-framework/tree/main/docs-portal/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
