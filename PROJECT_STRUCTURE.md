# Care1st Driver Timesheet - Project Structure

## Recommended Folder Structure

```
care1stApp/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Auth group - login screens
│   │   ├── _layout.tsx           # Auth layout (no tabs)
│   │   ├── login.tsx             # Unified login (driver/admin)
│   │   └── index.tsx             # Redirect to login
│   │
│   ├── (driver)/                 # Driver group - driver screens
│   │   ├── _layout.tsx           # Driver tab layout
│   │   ├── index.tsx             # Driver home / shift control
│   │   ├── shift.tsx             # Active shift view
│   │   └── summary.tsx           # Daily shift summary
│   │
│   ├── (admin)/                  # Admin group - admin screens
│   │   ├── _layout.tsx           # Admin layout
│   │   ├── index.tsx             # Dashboard - all drivers
│   │   ├── driver/[id].tsx       # Single driver detail
│   │   └── shift/[id].tsx        # Shift detail view
│   │
│   ├── _layout.tsx               # Root layout (auth check)
│   └── index.tsx                 # Entry - redirect by role
│
├── src/
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   ├── auth.ts               # Auth helpers
│   │   └── constants.ts          # App constants
│   │
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth state hook
│   │   ├── useLocation.ts        # GPS location hook
│   │   └── useShift.ts           # Active shift hook
│   │
│   ├── services/
│   │   ├── gps.ts                # GPS tracking logic
│   │   ├── shift.ts              # Shift CRUD + business logic
│   │   ├── travelTime.ts         # Travel time estimation
│   │   └── suspiciousActivity.ts # Flagging rules
│   │
│   ├── types/
│   │   └── index.ts              # All TypeScript types
│   │
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives
│   │   ├── driver/               # Driver-specific components
│   │   └── admin/                # Admin-specific components
│   │
│   └── utils/
│       ├── geo.ts                # Distance, movement detection
│       └── time.ts               # Time calculations
│
├── supabase/
│   ├── migrations/               # SQL migrations
│   │   └── 001_initial_schema.sql
│   └── seed.sql                  # Optional seed data
│
├── assets/                       # Images, fonts
├── app.json                     # Expo config
├── package.json
├── tsconfig.json
└── .env.example                  # Env vars template
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Expo Router** | File-based routing, native navigation, easy deep linking |
| **(auth), (driver), (admin) groups** | Clear separation by role; layouts per role |
| **src/lib** | Supabase client, auth, constants - minimal deps |
| **src/services** | Business logic isolated from UI; testable |
| **src/hooks** | Shared state (auth, location, shift) |
| **supabase/migrations** | Version-controlled schema; reproducible deploys |

## File Count Summary (MVP)

- **App routes:** ~10 files
- **Services:** 4 files
- **Hooks:** 3 files
- **Types:** 1 file
- **Components:** As needed (keep minimal for MVP)
