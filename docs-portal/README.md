# SaaS Platform Documentation Portal

This directory contains the Docusaurus site for the SaaS Platform docs.

## Setup

Install dependencies (from the repo root or within this folder):

```bash
npm install
```
## Commands

- `npm start` – Start local dev server
- `npm run build` – Build static site
- `npm run serve` – Serve built site
- `npm run docs:version 1.0` – Snapshot docs for versioning

## Deployment

The site can be deployed to any static hosting provider. For GitHub Pages:

```bash
npm run build
npx docusaurus deploy
```

For Netlify or Vercel, configure the build command as `npm run build` and the output directory as
`build/`.

## Contributing

Documentation updates are welcome. Submit pull requests and ensure `npm run build` completes
successfully before requesting a review.
