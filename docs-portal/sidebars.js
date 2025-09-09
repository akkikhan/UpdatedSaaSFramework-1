module.exports = {
  defaultSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/prerequisites',
        'getting-started/quickstart',
        'getting-started/faqs',
      ],
    },
    {
      type: 'category',
      label: 'SDK Integration',
      items: [
        'sdk-integration/overview',
        'sdk-integration/installation',
        'sdk-integration/configuration',
        {
          type: 'category',
          label: 'Examples',
          items: [
            'sdk-integration/examples/node',
            'sdk-integration/examples/browser',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Modules',
      items: [
        {
          type: 'category',
          label: 'Auth',
          items: [
            'modules/auth/overview',
            'modules/auth/server-setup',
            'modules/auth/client-sdk',
            'modules/auth/troubleshooting',
          ],
        },
        {
          type: 'category',
          label: 'RBAC',
          items: [
            'modules/rbac/overview',
            'modules/rbac/policy-model',
            'modules/rbac/examples',
          ],
        },
        {
          type: 'category',
          label: 'Logging',
          items: [
            'modules/logging/overview',
            'modules/logging/quickstart',
            'modules/logging/sinks',
          ],
        },
        {
          type: 'category',
          label: 'Email',
          items: [
            'modules/email/overview',
            'modules/email/template-management',
            'modules/email/providers',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Platform Admin',
      items: [
        'platform-admin/portal-overview',
        'platform-admin/sdk-guide',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/api/auth',
        'reference/api/rbac',
        'reference/api/logging',
        'reference/api/email',
        'reference/cli',
        'reference/architecture',
      ],
    },
  ],
};
