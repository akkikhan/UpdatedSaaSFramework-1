# SaaS Platform

This repository contains the SaaS framework and an accompanying documentation portal.

## Documentation Portal

The docs portal is located in the `docs-portal/` directory and is built with [Docusaurus](https://docusaurus.io/).

Install dependencies (root and docs portal) with:

```bash
npm install
```

### Commands

```bash
# start local dev server
npm --prefix docs-portal start

# build static site
npm --prefix docs-portal run build

# snapshot docs for versioning
npm --prefix docs-portal run docs:version 1.0
```

The generated site can be deployed to any static host. For example, to build and deploy to GitHub Pages:

```bash
npm --prefix docs-portal run build
npx --prefix docs-portal docusaurus deploy
```

## Tests

The main project uses `eslint` and `jest`:

```bash
npm run lint
npm test
```

Ensure dependencies are installed with `npm install` before running tests or the docs commands.
