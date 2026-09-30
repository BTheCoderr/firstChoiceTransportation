# First Choice Transportation

<!-- repo-intro:start -->
**Project snapshot:** A production-oriented Expo/Supabase transportation operations app for drivers and admins, covering time tracking, weekly hours, driver creation, home bases, location-aware workflows, notifications, and release tooling.

**What it demonstrates:** Expo/React Native · TypeScript · Supabase Auth/Postgres/RLS · Edge Functions · mobile operations UX.
<!-- repo-intro:end -->

## Product scope

This repository contains the mobile operations app for **First Choice Transportation**. It supports separate driver and admin workflows rather than functioning as a generic transportation landing page.

### Admin workflows

- Create and manage driver accounts
- Assign optional home-base location data
- Review weekly hours
- Use protected Supabase Edge Functions for privileged account creation

### Driver/mobile workflows

- Expo Router navigation
- Location-aware functionality
- Secure local storage
- Push-notification support
- Supabase-backed authentication and operational data

## Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Supabase
- Expo Router
- EAS build/release tooling

## Local setup

```bash
npm install
npm start
```

Use the environment and release guidance already documented in this repository before running against production services.
