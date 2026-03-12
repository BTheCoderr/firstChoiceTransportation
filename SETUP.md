# First Choice Transportation – Setup Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app (for physical device testing)
- iOS Simulator or Android Emulator (optional)
- Supabase account

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Note:** The `EXPO_PUBLIC_` prefix is required for Expo to expose vars to the app.  
> Get the anon key from Supabase Dashboard → Settings → API → Project API keys.

## 3. Supabase migrations

1. Create a project at [supabase.com](https://supabase.com)
2. Open the SQL Editor
3. Run migrations in order:
   - Copy and run `supabase/migrations/001_initial_schema.sql`
   - Copy and run `supabase/migrations/002_profiles_login_identifier.sql` (if it exists)

## 4. Create test users

In Supabase Dashboard → Authentication → Users → Add user:

| Email | Password (your choice) |
|-------|------------------------|
| admin@firstchoicetransport.com | e.g. `Test123!` |
| driver1@firstchoicetransport.com | e.g. `Test123!` |
| driver2@firstchoicetransport.com | e.g. `Test123!` |

The `handle_new_user` trigger will create profiles. The seed script assigns roles and company.

## 5. Seed data

After creating the users, run `supabase/seed.sql` in the SQL Editor. This will:

- Assign `admin` role to admin@...
- Assign `driver` role to driver1@ and driver2@
- Add driver bases (home/office)
- Insert sample completed shifts
- Insert sample route points and weekly summaries

## 6. Assets (optional)

Expo requires `icon.png`, `splash-icon.png`, and `adaptive-icon.png` in `assets/`.

**Option A – Placeholder (quick start):**

```bash
node scripts/create-placeholder-assets.js
```

**Option B – Full assets from Expo template:**

```bash
chmod +x scripts/get-assets.sh
./scripts/get-assets.sh
```

## 7. Start the app

```bash
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go on a physical device

## 8. Background location (Android)

Background GPS tracking does **not** work in Expo Go on Android. Use a development build:

```bash
npx expo prebuild
npx expo run:android
```

## Project structure

```
care1stApp/
├── app/                 # Expo Router screens
│   ├── (auth)/          # Login flow
│   ├── (driver)/        # Driver: Home, Shift, Summary
│   └── (admin)/         # Admin: Dashboard, Driver/Shift detail
├── src/
│   ├── lib/             # Supabase client
│   ├── constants/       # Movement, location, suspicious thresholds
│   ├── hooks/            # useAuth, useDriverShift, useAdminDashboard
│   ├── services/         # shifts, movement, endShift, suspicious, admin
│   ├── types/            # TypeScript types
│   ├── components/       # UI components
│   └── utils/            # Geo, time helpers
└── supabase/
    ├── migrations/       # Database schema
    └── seed.sql          # Test data
```

## Config summary

| Config | Purpose |
|--------|---------|
| `app.config.ts` | Location, Notifications plugins; iOS/Android permissions |
| `babel.config.js` | Path alias `@/*` → `src/*` |
| `tsconfig.json` | Strict mode, path aliases |
