# First Choice Transportation - Web (Marketing & Support)

Next.js + TypeScript site for App Store Connect URLs.

## Routes

- `/` - Marketing / home page
- `/support` - Support page (use as Support URL in App Store Connect)

## Run locally

```bash
cd web && npm run dev
```

## Deploy (Vercel recommended)

```bash
cd web && npx vercel
```

Or connect the `web` folder to Vercel in the dashboard. After deploy, use:
- **Marketing URL:** `https://your-domain.vercel.app`
- **Support URL:** `https://your-domain.vercel.app/support`
