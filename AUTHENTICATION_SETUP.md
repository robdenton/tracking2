# Authentication Setup Guide

This app now uses Google OAuth authentication and only allows users with `@granola.so` email addresses.

## Setup Steps

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Click **Create Credentials** → **OAuth client ID**
4. Configure OAuth consent screen if prompted:
   - User Type: Internal (if available) or External
   - App name: Marketing Activity Impact
   - User support email: your@granola.so
   - Developer contact: your@granola.so
5. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: Marketing Activity Impact
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for local development)
     - `https://tracking2-dg0i31dlt-robdentons-projects.vercel.app/api/auth/callback/google` (for production)
6. Save the **Client ID** and **Client Secret**

### 2. Set Environment Variables

#### Local Development

Add to your `.env` file:

```bash
# Authentication
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your_client_id_from_step_1>
GOOGLE_CLIENT_SECRET=<your_client_secret_from_step_1>
```

Generate a secret:
```bash
openssl rand -base64 32
```

#### Production (Vercel)

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

```bash
NEXTAUTH_SECRET=<generate_with_openssl_rand_base64_32>
NEXTAUTH_URL=https://tracking2-dg0i31dlt-robdentons-projects.vercel.app
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
```

**Note**: Your actual credentials are already configured in your local `.env` file and should be added to Vercel dashboard.

### 3. Test Authentication

1. **Local**: Run `npm run dev` and visit `http://localhost:3000`
2. **Production**: Deploy to Vercel and visit your app URL
3. You should be redirected to the sign-in page
4. Click "Sign in with Google"
5. Use a `@granola.so` email address
6. You should be redirected to the dashboard

### 4. Troubleshooting

**"Access Denied" error**
- Make sure you're using an email ending with `@granola.so`
- Check that the email domain restriction in `apps/web/src/lib/auth.ts` is correct

**"Redirect URI mismatch" error**
- Make sure the redirect URI in Google Cloud Console matches your app URL exactly
- Format: `https://your-domain.com/api/auth/callback/google`

**"Invalid client" error**
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Verify they match the credentials in Google Cloud Console

**Session not persisting**
- Check that `NEXTAUTH_SECRET` is set and is a long random string
- Verify database connection is working

## How It Works

1. **Middleware** (`apps/web/src/middleware.ts`): Protects all pages except auth pages
2. **Auth Config** (`apps/web/src/lib/auth.ts`):
   - Configures Google OAuth
   - Restricts access to `@granola.so` emails only
   - Handles session management
3. **Database**: Stores user accounts and sessions in PostgreSQL
4. **Sign In Page** (`apps/web/src/app/auth/signin/page.tsx`): Custom sign-in UI
5. **User Menu** (`apps/web/src/app/components/UserMenu.tsx`): Shows logged-in user info and sign-out button

## Modifying Email Restrictions

To allow different email domains, edit `apps/web/src/lib/auth.ts`:

```typescript
async signIn({ user, account, profile }) {
  // Change this line to allow other domains:
  if (user.email && user.email.endsWith("@yourdomain.com")) {
    return true;
  }
  return false;
}
```

Or to allow multiple domains:

```typescript
async signIn({ user, account, profile }) {
  const allowedDomains = ["@granola.so", "@example.com"];
  if (user.email && allowedDomains.some(domain => user.email!.endsWith(domain))) {
    return true;
  }
  return false;
}
```

## Security Notes

- Never commit `.env` files to Git (already in `.gitignore`)
- Keep `NEXTAUTH_SECRET` secret and rotate periodically
- Use different secrets for development and production
- Only add trusted domains to allowed email list
