# NEW JERSEY MULTISERVICE & DESIGN

Public website and payment portal for NEW JERSEY MULTISERVICE & DESIGN.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The production output is generated in `dist/`.

## Deployment

This project is ready for Netlify. The included `netlify.toml` uses:

- Build command: `npm run build`
- Publish directory: `dist`
- Primary domain: `https://newjerseymultiservice.com`

## Private Customer Data

Customer seed data is intentionally excluded from Git with `.gitignore`.
Do not commit private customer names, addresses, phone numbers, or notes to the public website repository.
