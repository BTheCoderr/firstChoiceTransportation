# Step 1: Project Setup – Output Summary

## File Tree

```
care1stApp/
├── app/
│   ├── _layout.tsx              # Root layout (Stack, StatusBar)
│   ├── index.tsx                # Entry: role selector (Driver/Admin)
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth stack layout
│   │   └── index.tsx            # Login placeholder
│   ├── (driver)/
│   │   ├── _layout.tsx          # Driver tabs layout
│   │   ├── index.tsx            # Driver home
│   │   ├── shift.tsx            # Active shift
│   │   └── summary.tsx          # Daily summary
│   └── (admin)/
│       ├── _layout.tsx          # Admin stack layout
│       ├── index.tsx            # Dashboard
│       ├── driver/[id].tsx      # Driver detail
│       └── shift/[id].tsx       # Shift detail
├── src/
│   └── lib/
│       ├── supabase.ts          # Supabase client (SecureStore)
│       └── constants.ts         # App constants
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   └── adaptive-icon.png
├── scripts/
│   ├── get-assets.sh            # Fetch full Expo assets
│   └── create-placeholder-assets.js
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── .gitignore
├── app.config.ts
├── babel.config.js
├── package.json
├── tsconfig.json
├── SETUP.md
├── PROJECT_STRUCTURE.md
├── IMPLEMENTATION_ROADMAP.md
└── STEP1_OUTPUT.md
```

---

## Package Dependencies

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~51.0.0 | Core framework |
| expo-router | ~3.5.0 | File-based routing |
| @supabase/supabase-js | ^2.39.0 | Supabase client |
| expo-location | ~17.0.0 | GPS tracking |
| expo-task-manager | ~11.7.0 | Background tasks |
| expo-notifications | ~0.28.0 | Push notifications |
| expo-secure-store | ~13.0.0 | Session storage for Supabase |
| react-native-url-polyfill | ^2.0.0 | URL polyfill for Supabase |
| react-native-safe-area-context | 4.10.1 | Safe areas |
| react-native-screens | ~3.31.1 | Native screens |

### Dev Dependencies

| Package | Version |
|---------|---------|
| @babel/core | ^7.24.0 |
| babel-plugin-module-resolver | ^5.0.0 |
| typescript | ~5.3.0 |
| @types/react | ~18.2.45 |

---

## Install Commands

```bash
cd care1stApp
npm install
```

---

## Environment Variables

Copy and edit:

```bash
cp .env.example .env
```

Required in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Config Summary

### app.config.ts

- **Location:** `expo-location` plugin with usage descriptions
- **Notifications:** `expo-notifications` plugin
- **iOS:** `UIBackgroundModes: ["location"]`, NSLocation* permissions
- **Android:** `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
- **Scheme:** `care1st` for deep linking
- **Typed routes:** enabled

### tsconfig.json

- Extends `expo/tsconfig.base`
- `strict: true`
- Path alias: `@/*` → `src/*`

### babel.config.js

- `babel-preset-expo`
- `babel-plugin-module-resolver` for `@/` → `src/`

---

## Navigation Structure

| Route | Layout | Screens |
|-------|--------|---------|
| `/` | Root Stack | Role selector (Driver / Admin) |
| `/(auth)` | Stack | Login (placeholder) |
| `/(driver)` | Tabs | Home, Shift, Summary |
| `/(admin)` | Stack | Dashboard, Driver/[id], Shift/[id] |

---

## Setup Notes

1. **Assets:** Placeholder assets are created. For production, run `./scripts/get-assets.sh` or add your own icons.
2. **Supabase:** Create a project and run `supabase/migrations/001_initial_schema.sql` before using the app.
3. **Start app:** `npx expo start` then press `i` (iOS) or `a` (Android).
4. **Path alias:** Use `@/lib/supabase` instead of `../../src/lib/supabase`.
