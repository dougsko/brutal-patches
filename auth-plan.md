# Pure Google OAuth Plan (updated — no hybrid, no admin)
No previous auth plan used. Current auth = local username/password JWT (auth.service/controller/module) + passport local + admin/user pages.

## Access rules
- Not logged in: can view main patch list only (read-only)
- Logged in with Google: can create patches and edit your own patches
- No user management / no admin page / remove register/login form

## Plan steps
1. Google Cloud: OAuth 2.0 Client ID / secret, redirect URI to /auth/google/callback
2. Server (server-src):
   - npm install passport-google-oauth20 @types/passport-google-oauth20
   - auth.module: replace local/Passport with GoogleStrategy; remove user/password services if not needed
   - auth.controller: /auth/google and /auth/google/callback; on success return user profile (email/name/sub from Google)
   - Remove JWT sign/verify if not needed (pure Google session via OAuth); or keep minimal session cookie if needed
   - Remove /users management endpoints not needed; drop admin module/routes from backend
3. Frontend:
   - Replace login/register forms with Google sign-in button linking to /auth/google
   - After /auth/google/callback, store Google user info; use it for "my patches" filter
   - Guard routes: patch-list = public; patch-create/edit/my-patch-list = requires Google auth session
   - Remove admin/pages, profile app routes, register component usage from routing
4. Remove/admin cleanup:
   - Remove src/app/admin/ module from imports/routing if not needed
   - Drop register/login form UI; keep only Google entry button (optional login link)
   - Update guards/decorators: @Public() for patch list, @GoogleAuth() for edit/create

Next: user decides whether to implement server + frontend together.
