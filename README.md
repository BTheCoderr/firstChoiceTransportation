# First Choice Transportation

GPS-verified driver timesheet app for a transportation company. Drivers are tracked by GPS, work hours are derived from movement and route timing, and admins can review driver hours and suspicious activity.

## What it does

- **Drivers**: Log in, start shifts, get GPS-tracked routes, record final dropoff. The app computes verified hours from clock-in to estimated return-to-base time.
- **Admins**: View drivers, weekly totals, recent shifts, and shift details. Flagged shifts show suspicious activity reasons.
- **Suspicious detection**: Automatic flagging for no movement at start, late first movement, long idle periods, and extended shifts.

## Tech stack

- **Frontend**: Expo React Native (TypeScript), Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Location**: Expo Location, Expo Task Manager (background GPS)
- **Notifications**: Expo Notifications (configured for future use)

## Required environment variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and set:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

Get these from Supabase Dashboard → Settings → API.

## Install dependencies

```bash
npm install
```

## Run the app

```bash
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go on a physical device

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in order via SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_profiles_login_identifier.sql` (if present)
3. Create test users in Auth → Users, then run `supabase/seed.sql` to assign roles and add sample data

See [SETUP.md](./SETUP.md) for detailed setup steps.

## Background location (Android)

Background GPS tracking does **not** work in Expo Go on Android. Use a development build:

```bash
npx expo prebuild
npx expo run:android
```

Or build with EAS: `eas build --profile development --platform android`

## Test users

After running migrations and seed:

| Email | Password | Role |
|-------|----------|------|
| admin@firstchoicetransport.com | (set in Auth) | Admin |
| driver1@firstchoicetransport.com | (set in Auth) | Driver |
| driver2@firstchoicetransport.com | (set in Auth) | Driver |

Create these users in Supabase Auth → Users before running the seed.

## MVP limitations

- Travel time is estimated via straight-line distance; no Google Maps integration yet
- No web admin; mobile-only
- No edit forms for shifts or driver bases
- Weekly summaries are computed on-the-fly; no pre-aggregation
- Background location requires a dev build on Android

## Future improvements

- Google Maps Directions API for accurate travel time
- Web admin dashboard
- Push notifications for shift reminders
- Offline support
- Export/reporting
