# Google OAuth Authentication Setup

This guide will help you set up Google OAuth authentication for your application.

## Prerequisites

- Google Cloud Platform account
- Access to your Gmail account that you want to allow

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (unless using Google Workspace)
   - Fill in app name, user support email, and developer contact
   - Add scopes: `email`, `profile`, `openid` (these are added automatically for basic auth)
   - Save and continue

4. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback`
     - (Add production URL when deploying)
   - Click "Create"
   - Copy the Client ID and Client Secret

## Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```env
   # Google OAuth credentials from Step 1
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

   # Your Gmail address (only this email will be allowed to login)
   ALLOWED_EMAIL=your-email@gmail.com

   # Generate secure secrets (run: openssl rand -base64 32)
   JWT_ACCESS_SECRET=<generate-a-random-secret>
   JWT_REFRESH_SECRET=<generate-another-random-secret>

   # Frontend URL where users will be redirected after login
   FRONTEND_URL=http://localhost:3001
   ```

3. Generate JWT secrets:
   ```bash
   # Generate access token secret
   openssl rand -base64 32

   # Generate refresh token secret
   openssl rand -base64 32
   ```

## Step 3: Update .gitignore

Make sure `.env` is in your `.gitignore` (it should be already):
```
.env
```

## How It Works

### Authentication Flow

1. **User clicks "Login with Google"** on `@www/app` (port 5000)
   - Redirects to `http://localhost:3000/auth/google`

2. **Google OAuth flow**
   - User is redirected to Google for authentication
   - User approves access
   - Google redirects back to `/auth/google/callback`

3. **Server validates and generates tokens**
   - Verifies the email matches `ALLOWED_EMAIL`
   - Generates JWT access token (15 min expiry)
   - Generates JWT refresh token (7 day expiry)
   - Redirects to `@app/client` (port 3001) with tokens in URL

4. **Client stores tokens**
   - Extracts tokens from URL parameters
   - Stores in localStorage
   - Removes tokens from URL for security

5. **Protected API calls**
   - Client includes access token in `Authorization: Bearer <token>` header
   - Server validates token and checks email
   - If token expired, client uses refresh token to get new access token

### Token Types

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

### Security Features

- ✅ Stateless JWT authentication (no session storage needed)
- ✅ Email whitelist (only your email can login)
- ✅ PKCE flow for OAuth (code verifier)
- ✅ Automatic token refresh
- ✅ Secure token storage (localStorage)
- ✅ Token expiration handling

## API Endpoints

### Authentication Endpoints

- `GET /auth/google` - Initiates Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler
- `POST /auth/refresh` - Refresh access token
  ```json
  Request: { "refresh_token": "..." }
  Response: { "access_token": "..." }
  ```
- `POST /auth/logout` - Logout (client clears tokens)
- `GET /auth/me` - Get current user info (requires auth)

### Protected Endpoints

- `POST /squared` - Calculate square (requires `Authorization: Bearer <token>`)

## Testing the Flow

1. Start the server:
   ```bash
   cd apps/@app/server
   pnpm run dev
   ```

2. Start the client:
   ```bash
   cd apps/@app/client
   pnpm run dev
   ```

3. Start the main app:
   ```bash
   cd apps/@www/app
   pnpm run dev
   ```

4. Open http://localhost:5000
5. Click "Login with Google"
6. Authenticate with your Google account
7. You should be redirected to http://localhost:3001 (authenticated)

## Troubleshooting

### "Access denied" or "unauthorized" error
- Check that `ALLOWED_EMAIL` matches your Google account email exactly
- Check browser console for error messages

### OAuth callback error
- Verify redirect URI in Google Cloud Console matches exactly
- Check OAuth consent screen is configured properly

### Token expired
- Refresh tokens automatically handle expired access tokens
- If refresh token expires (after 7 days), user must login again

### CORS errors
- Server has CORS enabled for all origins in development
- For production, update CORS settings in `src/index.ts`

## Production Deployment

When deploying to production:

1. Update redirect URIs in Google Cloud Console
2. Update environment variables:
   - `GOOGLE_REDIRECT_URI` - production callback URL
   - `FRONTEND_URL` - production client URL
   - Generate new JWT secrets
3. Update CORS settings to restrict origins
4. Consider using Redis for OAuth state storage instead of in-memory Map
5. Use HTTPS for all URLs
