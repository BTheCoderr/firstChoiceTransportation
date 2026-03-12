# Self-Signup: Driver's License or Username

**Yes, this is possible.** Drivers can sign up themselves—no preset accounts needed.

## How It Works

Supabase Auth uses **email** as the primary identifier. We map both driver's license and username into a valid email format:

| User enters | Stored in Supabase Auth | Display |
|-------------|-------------------------|---------|
| Driver's license: `CA1234567` | `CA1234567@drivers.firstchoice.local` | Driver's license |
| Username: `john_doe` | `john_doe@drivers.firstchoice.local` | Username |

- **Login:** User enters their identifier (DL or username) + password.
- **Sign up:** User chooses "Driver's license" or "Username", enters it + password.
- **Profile:** Store `login_type` (`dl` or `username`) and `login_id` (the raw value) in `profiles` for display.

## Implementation Outline

1. **Signup screen**
   - Toggle: "Sign up with driver's license" / "Sign up with username"
   - Input: identifier + password
   - Call `supabase.auth.signUp({ email: `${identifier}@drivers.firstchoice.local`, password })`
   - Store `login_type` and `login_id` in profile metadata on first login

2. **Login screen**
   - Single input: identifier (DL or username)
   - Append `@drivers.firstchoice.local` and call `supabase.auth.signInWithPassword()`

3. **Supabase config**
   - Enable "Email" auth
   - Turn off "Confirm email" if you want immediate access (or keep it and send to the synthetic address)
   - Admins can still use real email/password

## Database

Migration `002_profiles_login_identifier.sql` adds:

- `login_type` – `'dl'` | `'username'` | `'email'`
- `login_id` – raw value for display (DL number or username)

## Admin Accounts

Admins can keep using real email (e.g. `admin@firstchoicetransport.com`). The `@drivers.firstchoice.local` domain is only for driver identifiers.
