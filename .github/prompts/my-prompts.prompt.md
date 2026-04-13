---


mode: agent

---
description: "Implement a complete auth system: login page with Google OAuth and email/password, registration, forgot password flow, password reset via email link, and secure JWT sessions. Uses NextAuth, Prisma adapter, bcrypt, and nodemailer."
name: "Auth — Full Flow (Login, Register, Forgot & Reset Password)"
argument-hint: "Brand colors, app name, redirect path, or SMTP provider"
agent: "agent"
---

Implement a **complete authentication system** for a Next.js App Router project. Cover every step below in order. Do not skip any step.

## Stack

- Next.js 14+ (App Router, TypeScript)
- NextAuth.js v4 (`next-auth`, `@next-auth/prisma-adapter`)
- Prisma 7 (existing `lib/prisma.ts`)
- `bcrypt` + `@types/bcrypt`
- `nodemailer` + `@types/nodemailer`
- Tailwind CSS

Install any missing packages before proceeding.

---

## 1. Auth utilities — `lib/auth-utils.ts`

```ts
export const DEFAULT_AUTH_REDIRECT = '/';
export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 72; // bcrypt truncates at 72 — cap to prevent DoS
export const AUTH_NAME_MAX_LENGTH = 80;

export function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getSafeCallbackPath(callbackUrl?: string | null) {
  if (!callbackUrl || !callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) {
    return DEFAULT_AUTH_REDIRECT;
  }
  try {
    const url = new URL(callbackUrl, 'http://localhost');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
```

---

## 2. Prisma schema additions — `prisma/schema.prisma`

> **Prisma 7 note**: Do **not** include a `datasource url` in `schema.prisma`. The database URL belongs in `prisma.config.ts`. The schema datasource block should only declare the provider:
>
> ```prisma
> datasource db {
>   provider = "postgresql"
> }
> ```

Add these models (required by `@next-auth/prisma-adapter` + password reset):

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())
  @@index([userId])
}
```

Run `npx prisma migrate dev --name add_auth_models` then `npx prisma generate`.

---

## 3. NextAuth config — `lib/auth.ts`

- **adapter**: `PrismaAdapter(prisma)`
- **session**: `{ strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 }`
- **jwt**: `{ maxAge: 60 * 60 * 24 * 7 }`
- **pages**: `{ signIn: '/login', error: '/login' }`
- **providers**:
  - `GoogleProvider` — reads `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - `CredentialsProvider` — `authorize`:
    1. Reject if credentials missing
    2. Reject early if `password.length > AUTH_PASSWORD_MAX_LENGTH` (avoids bcrypt DoS)
    3. Find user by `normalizeEmail(email)` via `prisma.user.findUnique`
    4. `throw new Error('Invalid email or password.')` for **any** failure — never leak which field was wrong
    5. `bcrypt.compare` only — never timing-unsafe equality
- **callbacks**:
  - `jwt` — copy `user.id` → `token.sub` on first sign-in (`if (user) token.sub = user.id`)
  - `session` — copy `token.sub` → `session.user.id`
  - `redirect` — if `url.startsWith('/')` return `${baseUrl}${getSafeCallbackPath(url)}`; otherwise parse with `new URL`, check `target.origin === baseUrl`, else fall back to `DEFAULT_AUTH_REDIRECT`
- **secret**: `process.env.NEXTAUTH_SECRET`

---

## 4. NextAuth route — `app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## 5. TypeScript augmentation — `types/next-auth.d.ts`

```ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
```

> **Critical**: Import `DefaultSession` directly from `'next-auth'`. Do **not** re-export or import it from anywhere else — doing so can shadow the `next-auth` module and break `NextAuthOptions` / default import typing.

---

## 6. Registration API — `app/api/auth/register/route.ts`

`POST` — parse JSON body (return `400` if malformed); validate:
1. `email` and `password` present — `400` if missing
2. `isValidEmail(email)` — `400` if invalid
3. `password.length >= AUTH_PASSWORD_MIN_LENGTH` — `400` if too short
4. `password.length <= AUTH_PASSWORD_MAX_LENGTH` — `400` if too long
5. `name.length <= AUTH_NAME_MAX_LENGTH` — `400` if too long (name is optional)

Then:
- `prisma.user.findUnique({ where: { email } })` — return `409 { error: 'An account with this email already exists.' }` if found
- `bcrypt.hash(password, 10)` and `prisma.user.create({ data: { name, email, passwordHash } })`
- Return `201 { ok: true }` — do **not** return the user object
- Wrap the whole handler in `try/catch` → return `500` on unexpected errors

---

## 7. Mailer utility — `lib/mailer.ts`

Create a nodemailer transporter reading from env:
- `SMTP_HOST`, `SMTP_PORT` (default `587`), `SMTP_SECURE` (`'true'`/`'false'`), `SMTP_USER`, `SMTP_PASS`
- `from`: `process.env.SMTP_FROM ?? process.env.SMTP_USER`

Export `sendPasswordResetEmail(to: string, resetUrl: string)` — sends a branded HTML email. The HTML should include:
- A serif heading ("Reset your password")
- A short explanation with the expiry time bolded ("1 hour")
- A CTA button linking to `resetUrl` styled with the brand dark-green background and lime text
- A footer note: "If you didn't request this, you can safely ignore this email."

---

## 8. Forgot password API — `app/api/auth/forgot-password/route.ts`

`POST { email }`:
1. Parse body — `400` if malformed
2. Validate `email` is a non-empty string — `400` if missing
3. `normalizeEmail`, look up user — **always return `{ success: true }`** regardless of whether the email exists (prevents enumeration)
4. Skip (return success) if user has no `passwordHash` — Google-only accounts cannot reset via email
5. `prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })` — purge stale tokens
6. `crypto.randomBytes(32).toString('hex')` token, `expires = new Date(Date.now() + 60 * 60 * 1000)`
7. `prisma.passwordResetToken.create(...)` with `userId`, `token`, `expires`
8. Build `resetUrl = ${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/reset-password?token=...`
9. Call `sendPasswordResetEmail` — **wrap in try/catch**, `console.error` on failure, do not fail the response
10. Return `{ success: true }`

---

## 9. Reset password API — `app/api/auth/reset-password/route.ts`

`POST { token, password }`:
1. Parse body — `400` if malformed
2. Validate `token` is a non-empty string — `400` if missing
3. Validate password length (`AUTH_PASSWORD_MIN_LENGTH` to `AUTH_PASSWORD_MAX_LENGTH`) — `400` if invalid
4. `prisma.passwordResetToken.findUnique({ where: { token } })` — return `400 'This reset link has expired or is invalid.'` if not found or `record.expires < new Date()`
5. `bcrypt.hash(password, 12)`, `prisma.user.update({ where: { id: record.userId }, data: { passwordHash } })`
6. `prisma.passwordResetToken.delete({ where: { token } })` — delete immediately after use
7. Return `{ success: true }`

---

## 10. Login page — `app/login/page.tsx`

Server component with `searchParams` typed as `Promise<{ callbackUrl?: string; error?: string }>` (Next.js 15+):

1. `await searchParams` to resolve the Promise
2. `getServerSession(authOptions)` — `redirect(callbackUrl)` if already authenticated
3. Sanitize `callbackUrl` through `getSafeCallbackPath`

**Layout** — `min-h-screen`, `bg-[#f5f0e8]`, `pt-28` (navbar offset), `text-[#171717]`:
- Radial gradient overlay: `bg-[radial-gradient(circle_at_top_left,_rgba(228,243,134,0.55),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(17,67,15,0.14),_transparent_32%),linear-gradient(135deg,_#f8f5ef_0%,_#efe6d6_100%)]`
- Soft white glow: `absolute inset-x-0 top-16 mx-auto h-72 w-72 rounded-full bg-white/30 blur-3xl`
- Two-column grid on large screens (`lg:grid-cols-[1.05fr_0.95fr]`), single column on mobile, `lg:items-center`

**Left column** (brand copy):
- Eyebrow: `text-xs font-semibold uppercase tracking-[0.4em] text-[#11430F]/70`
- H1: `font-serif text-5xl md:text-7xl text-[#11430F]`
- Three feature cards: `rounded-3xl border border-white/60 bg-white/55 p-4 backdrop-blur-sm` in a `sm:grid-cols-3` grid

**Right column** (form):
- Wrap `<AuthPageForm callbackUrl={callbackUrl} oauthError={error} />` in `<Suspense fallback={...}>` — required because the form calls `useSearchParams`
- Suspense fallback: animated pulse placeholder matching the card dimensions

---

## 11. Auth form — `components/auth/AuthPageForm.tsx`

Client component (`'use client'`). Props: `{ callbackUrl: string; oauthError?: string }`.

**State**: `mode: 'signin' | 'signup'`, `name`, `email`, `password`, `error` (initialised from `resolveOAuthError(oauthError)`), `isLoading`.

**`useSearchParams`**: detect `?reset=success` → show green success banner ("Password updated successfully. Sign in with your new password.").

**OAuth error map**:
```ts
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: 'Google sign-in failed. Please try again.',
  OAuthSignin: 'Could not start Google sign-in. Please try again.',
  OAuthCreateAccount: 'Could not create account with Google. Please try again.',
  OAuthAccountNotLinked: 'This email is already registered with a password. Please sign in with your email instead.',
  Callback: 'Authentication callback failed. Please try again.',
  Default: 'An authentication error occurred. Please try again.',
};
```

**Card** — `rounded-[2rem] border border-white/60 bg-white/85 p-6 md:p-8 shadow-2xl shadow-black/10 backdrop-blur-xl`

**Card header** — flex row with title on left and a "Home" link (rounded-full pill border) on right.

**Google button** — `signIn('google', { callbackUrl })`. Include the actual four-path Google SVG (blue `#4285F4`, green `#34A853`, yellow `#FBBC05`, red `#EA4335`). Disable while `isLoading`.

**Divider** — `h-px flex-1 bg-gray-200` / `text-xs uppercase tracking-[0.3em] text-gray-400` "or"

**Email form**:
- Sign-up only: Name field (`maxLength={AUTH_NAME_MAX_LENGTH}`)
- Email field (always)
- Password field (always): `minLength` / `maxLength` from constants
- Sign-in mode only: "Forgot password?" link (`href="/forgot-password"`) positioned below the password input

**Submit logic**:
- Sign-up: `POST /api/auth/register` → on error display `payload.error`; on success fall through
- Both modes: `signIn('credentials', { email, password, redirect: false, callbackUrl })`
- On success (`result.url` present, no `result.error`): `router.replace(result.url ?? callbackUrl)` + `router.refresh()`
- On error: display `result.error`

**Mode switcher** — toggle link below form. Switching mode resets password field and clears errors.

**Input styling** — `rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#11430F] focus:ring-2 focus:ring-[#e4f386]`

**Submit button** — `rounded-2xl bg-[#11430F] px-4 py-3 text-sm font-semibold text-[#e4f386] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`

---

## 12. Forgot password page — `app/forgot-password/page.tsx`

Client component. Centered single-column layout matching the login page background.

**Card** — same `rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-2xl backdrop-blur-xl` style.

**States**:
- Pre-submit: email input + submit button ("Send Reset Link" / "Sending…")
- Post-submit (`submitted = true`): show confirmation message — _"If an account with that email exists, we've sent a reset link. Check your inbox — it expires in 1 hour."_ — always shown regardless of whether the email was found. Show a "Back to Sign In" button.
- Error: red `text-red-600` paragraph

Include a "Remember it? Sign in" link while in pre-submit state.

---

## 13. Reset password page — `app/reset-password/page.tsx`

Split into two components:

**`ResetPasswordForm`** (inner) — reads `?token` via `useSearchParams`:
- If no token: show error message + "Request a new link" → `/forgot-password`
- Form fields: **New Password** + **Confirm Password**, both with `minLength` / `maxLength` from constants and `autoComplete="new-password"`
- Client-side validation: passwords must match before submitting
- On submit: `POST /api/auth/reset-password` with `{ token, password }`
- On success: `router.replace('/login?reset=success')`

**`ResetPasswordPage`** (default export) — wraps `<ResetPasswordForm />` in `<Suspense>` boundary. Same background layout as forgot-password page.

---

## 14. Navbar frosted style on auth routes

The navbar must show dark text and a frosted/opaque background (without needing scroll) on:
`/login`, `/forgot-password`, `/reset-password`

Use `usePathname()` to detect these routes and apply the frosted style when `isFrosted` is true.

---

## 15. Environment variables — `.env.local`

```env
DATABASE_URL=postgresql://...    # used by prisma.config.ts, not schema.prisma

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=          # openssl rand -base64 32

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# SMTP — for password reset emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=                # Gmail: App Password (16 chars, no spaces)
SMTP_FROM="Your App <you@gmail.com>"
```

**Gmail App Password**: requires 2-Step Verification enabled. Generate at myaccount.google.com/apppasswords. Enter the 16-character password **without spaces**.

**Google OAuth**: add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI in Google Cloud Console.

**Prisma 7**: `DATABASE_URL` is read by `prisma.config.ts` — do not put a `url` in `schema.prisma`'s datasource block.

---

## Security checklist

- [ ] `AUTH_PASSWORD_MAX_LENGTH = 72` — bcrypt DoS prevention, cap enforced in both register and authorize
- [ ] `getSafeCallbackPath` uses `new URL(url, 'http://localhost')` to safely extract pathname+search+hash; rejects anything not starting with `/` or starting with `//`
- [ ] Credentials provider `throws` the same error string regardless of which field was wrong
- [ ] Forgot-password route always returns `{ success: true }` regardless of email existence
- [ ] Forgot-password skips Google-only accounts (no `passwordHash`) silently
- [ ] Reset token expiry is checked server-side (`record.expires < new Date()`)
- [ ] Reset token is deleted immediately after use (one-time use)
- [ ] Stale reset tokens are purged before issuing a new one
- [ ] TypeScript augmentation imports `DefaultSession` from `'next-auth'` directly to avoid shadowing
- [ ] `NEXTAUTH_SECRET` set and not committed to source control
- [ ] `SMTP_PASS` is a Gmail App Password, not your Google account password
- [ ] `DATABASE_URL` is in `.env.local` / `prisma.config.ts`, not in `schema.prisma`

---

