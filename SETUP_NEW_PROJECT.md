# Fresh Supabase Setup

## 1. Update .env

Edit your `.env` file and set:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxrxzpktxeaplsnatcvn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YRomSme0YzO7a_MvIqckew_txyt8AtZ
```

**Note:** Use the **publishable** key in the app. Never put the secret key in client code.

## 2. Link and push migrations

```bash
npx supabase link --project-ref xxrxzpktxeaplsnatcvn
npx supabase db push --yes
```

## 3. Create users in Supabase

Go to **Authentication → Users → Add user** and create:

| Email | Password |
|-------|----------|
| admin@firstchoicetransport.com | (your choice) |
| driver1@firstchoicetransport.com | (your choice) |
| driver2@firstchoicetransport.com | (your choice) |

## 4. Run seed

In **Supabase → SQL Editor**, paste and run the contents of `supabase/seed.sql`.

## 5. Start the app

```bash
npx expo start
```

Sign in with one of the users you created.
