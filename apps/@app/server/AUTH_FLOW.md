# Authentication Flow

This document describes the JWT-based authentication system with Google OAuth and automatic token refresh.

## Architecture Overview

The authentication system uses:
- **Google OAuth 2.0** for user authentication
- **JWT tokens** for stateless authorization
- **Access tokens** (15 minutes) stored in localStorage
- **Refresh tokens** (7 days) stored in httpOnly cookies
- **Interceptor-based** automatic token refresh and retry
- **Token rotation** for enhanced security

## Prerequisites

- Google Cloud Platform account
- Access to your Gmail account that you want to allow

## Setup: Google OAuth Credentials

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type (unless using Google Workspace)
   - Fill in app name, user support email, and developer contact
   - Add scopes: `email`, `profile`, `openid` (automatically added for basic auth)
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

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```env
   # Google OAuth credentials
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

## Authentication Flow

### Initial Login Flow

1. **User initiates login** from `@www/app` (port 5000)
   - User clicks "Login with Google"
   - Frontend redirects to `http://localhost:3000/auth/google`

2. **Server initiates OAuth flow**
   - Server generates PKCE code verifier and challenge
   - Stores state in memory (temporary)
   - Redirects user to Google OAuth consent screen

3. **User authenticates with Google**
   - User selects Google account and grants permissions
   - Google redirects to callback: `/auth/google/callback?code=...&state=...`

4. **Server validates and issues tokens**
   - Verifies state parameter (CSRF protection)
   - Exchanges authorization code for Google tokens
   - Fetches user profile from Google
   - Validates email against `ALLOWED_EMAIL` whitelist
   - Generates JWT access token (15 min expiry)
   - Generates JWT refresh token (7 day expiry)
   - Sets refresh token as httpOnly cookie (XSS protection)
   - Redirects to client with access token in URL: `http://localhost:3001?access_token=...`

5. **Client receives tokens**
   - Extracts access token from URL parameters
   - Stores access token in localStorage
   - Removes token from URL (security)
   - Refresh token is automatically stored in browser cookies (httpOnly)

### Token Types

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token | 15 minutes | localStorage | Authorization for API requests |
| Refresh Token | 7 days | httpOnly cookie | Obtain new access tokens |

### Protected API Request Flow

The client uses interceptors to automatically handle authentication:

#### Request Interceptor (Proactive Refresh)

```typescript
// Before every API request (except public endpoints):
1. Check if access token exists
2. Decode token and check expiry
3. If expires in < 5 minutes:
   - Call /auth/refresh endpoint (sends refresh token cookie)
   - Receive new access token
   - Store new access token
   - Update token rotation (new refresh token in cookie)
4. Add Authorization header: Bearer <access_token>
5. Send request
```

**Skipped endpoints**: `/auth/google`, `/auth/refresh`, `/auth/logout`, `/ping`

#### Response Interceptor (Reactive Retry on 401)

```typescript
// After receiving a 401 response:
1. If already refreshing, queue this request
2. Otherwise, start refresh process:
   - Call /auth/refresh endpoint
   - Receive new access token + new refresh token (rotation)
3. Retry original request with new token
4. Process all queued requests with new token
5. If refresh fails:
   - Clear tokens
   - Redirect to login
```

**Skipped endpoints**: `/auth/refresh`, `/auth/logout`

### Token Rotation (Security Feature)

Every time a refresh token is used to obtain a new access token:
1. Server generates a **new refresh token**
2. Old refresh token becomes invalid
3. New refresh token is set as httpOnly cookie
4. This prevents token reuse attacks

```typescript
// On every /auth/refresh call:
POST /auth/refresh
  → Validates old refresh token (from httpOnly cookie)
  → Generates new access token (15 min)
  → Generates new refresh token (7 day)
  → Sets new refresh token as httpOnly cookie
  → Returns new access token in response body
```

### Logout Flow

```typescript
1. Client calls logout()
2. Client sends DELETE request to /auth/logout
3. Server clears refresh_token cookie
4. Client clears localStorage (access token)
5. Client redirects to main app
```

## API Endpoints

### Authentication Endpoints

#### `GET /auth/google`
Initiates Google OAuth flow. Redirects to Google consent screen.

**Response**: 302 redirect to Google

#### `GET /auth/google/callback`
OAuth callback handler. Validates auth code and issues tokens.

**Query params**: `code`, `state`

**Response**: 302 redirect to `FRONTEND_URL?access_token=...`

**Sets cookie**: `refresh_token` (httpOnly, secure in production)

#### `POST /auth/refresh`
Refreshes access token using refresh token from httpOnly cookie.

**Request**: Automatic (credentials: 'include' sends cookie)

**Response**:
```json
{
  "access_token": "eyJhbGc..."
}
```

**Sets cookie**: New `refresh_token` (token rotation)

**Errors**:
- `400` - Missing refresh token
- `401` - Invalid or expired refresh token

#### `POST /auth/logout`
Logs out user and clears refresh token cookie.

**Request headers**: `Authorization: Bearer <access_token>`

**Response**: `204 No Content`

**Clears cookie**: `refresh_token`

#### `GET /auth/me`
Returns current authenticated user information.

**Request headers**: `Authorization: Bearer <access_token>`

**Response**:
```json
{
  "email": "user@example.com"
}
```

**Errors**:
- `401` - Missing or invalid token

### Protected Endpoints

All protected endpoints require `Authorization: Bearer <access_token>` header.

The SDK interceptors automatically add this header and handle token refresh.

#### `POST /squared`
Example protected endpoint that calculates the square of a number.

**Request**:
```json
{
  "number": 5
}
```

**Response**:
```json
{
  "result": 25
}
```

## Client Implementation

### Setup (apps/@app/client/src/lib/api-client.ts)

```typescript
import { client } from '@app/sdk';
import { ensureValidToken, refreshAccessToken } from './auth';

setupApiClient('http://localhost:3000');

// Interceptors handle auth automatically
client.interceptors.request.use(async (request, options) => {
  // Skip public endpoints
  if (url.includes('/auth/google') || url.includes('/ping')) {
    return request;
  }

  // Proactive refresh (5 min buffer)
  const token = await ensureValidToken();
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }

  return request;
});

client.interceptors.response.use(async (response, request, options) => {
  // Handle 401 with automatic retry
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry with new token
      const newToken = getAccessToken();
      request.headers.set('Authorization', `Bearer ${newToken}`);
      return await fetch(request);
    }
  }
  return response;
});
```

### Making API Calls

```typescript
// Just call the SDK method - interceptors handle everything
const response = await postSquared({ body: { number: 5 } });

if (response.data) {
  console.log(response.data.result); // 25
}
```

No manual auth header management or 401 handling needed!

## Security Features

- ✅ **Stateless JWT authentication** - No session storage needed
- ✅ **Email whitelist** - Only allowed email can login
- ✅ **PKCE flow** - OAuth code verifier prevents CSRF
- ✅ **Token rotation** - New refresh token on each refresh
- ✅ **httpOnly cookies** - Refresh tokens protected from XSS
- ✅ **Proactive refresh** - Tokens refreshed 5 min before expiry
- ✅ **Automatic retry** - 401 responses trigger refresh + retry
- ✅ **Request queuing** - Multiple simultaneous 401s = one refresh
- ✅ **Short-lived access tokens** - 15 min reduces exposure window
- ✅ **CORS protection** - Configurable allowed origins

## Token Lifetime Strategy

| Scenario | Access Token | Refresh Token | User Experience |
|----------|--------------|---------------|-----------------|
| Active user | Auto-refreshes every ~10-14 min | Rotates on each refresh | Seamless, no interruption |
| Inactive < 15 min | Expired | Valid | Next request triggers refresh |
| Inactive < 7 days | Expired | Valid | Next request triggers refresh |
| Inactive > 7 days | Expired | Expired | Must login again |

**Proactive refresh** (5 min buffer) ensures users never see auth errors during active use.

## Testing the Flow

### 1. Start all services

```bash
# Terminal 1: Server
cd apps/@app/server
pnpm run dev  # Port 3000

# Terminal 2: Client
cd apps/@app/client
pnpm run dev  # Port 3001

# Terminal 3: Main app
cd apps/@www/app
pnpm run dev  # Port 5000
```

### 2. Test login flow

1. Open http://localhost:5000
2. Click "Login with Google"
3. Authenticate with Google account matching `ALLOWED_EMAIL`
4. Should redirect to http://localhost:3001 (authenticated)
5. Check browser DevTools:
   - Application → Local Storage → access_token present
   - Application → Cookies → refresh_token present (httpOnly)

### 3. Test protected endpoints

1. On authenticated client, click "Ping Server"
2. Network tab shows request with Authorization header
3. Enter a number and click "Calculate"
4. Network tab shows authenticated request

### 4. Test token refresh

**Proactive refresh:**
1. Wait 10-14 minutes (token expires in 15 min, refreshes at 5 min buffer)
2. Make any API request
3. Network tab shows /auth/refresh called first
4. Original request retried with new token

**Reactive refresh (401 handling):**
1. Manually expire access token in localStorage (set to old/invalid value)
2. Make any API request
3. Network tab shows 401 response
4. Interceptor calls /auth/refresh
5. Original request retried successfully

### 5. Test logout

1. Click "Logout" button
2. Redirected to main app
3. Local storage cleared
4. Cookie cleared
5. Must login again to access protected resources

## Troubleshooting

### "Access denied" error
- ✓ Check `ALLOWED_EMAIL` matches Google account email exactly (case-sensitive)
- ✓ Check server logs for validation errors
- ✓ Verify email claim in JWT token (check browser DevTools → Application → Local Storage)

### OAuth callback error
- ✓ Verify redirect URI in Google Cloud Console matches exactly
- ✓ Check OAuth consent screen is published (or add test users)
- ✓ Ensure `GOOGLE_REDIRECT_URI` in .env matches Google Console

### Token refresh fails
- ✓ Check refresh_token cookie exists (DevTools → Application → Cookies)
- ✓ Verify JWT_REFRESH_SECRET hasn't changed
- ✓ Check cookie domain/path settings
- ✓ Ensure client sends `credentials: 'include'` for /auth/refresh

### CORS errors
- ✓ Server allows all origins in development
- ✓ Check client sends requests to correct baseUrl
- ✓ Verify credentials: 'include' is set in SDK config

### Infinite refresh loop
- ✓ Verify /auth/refresh is excluded from request interceptor
- ✓ Check that refresh endpoint doesn't require Authorization header
- ✓ Ensure refresh token cookie is being sent

## Production Deployment

When deploying to production:

### 1. Update Google OAuth settings
- Add production redirect URI to Google Cloud Console
- Update `GOOGLE_REDIRECT_URI` environment variable

### 2. Update environment variables
```env
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback
FRONTEND_URL=https://app.yourdomain.com
JWT_ACCESS_SECRET=<new-production-secret>
JWT_REFRESH_SECRET=<new-production-secret>
```

### 3. Security hardening
- ✓ Enable HTTPS for all URLs
- ✓ Update CORS to restrict origins (whitelist your domains)
- ✓ Set secure: true for cookies
- ✓ Consider Redis/database for OAuth state instead of in-memory Map
- ✓ Add rate limiting to /auth endpoints
- ✓ Enable sameSite: 'strict' or 'lax' for cookies
- ✓ Add CSP headers
- ✓ Monitor failed auth attempts

### 4. Cookie settings for production
```typescript
reply.setCookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,              // Require HTTPS
  sameSite: 'lax',           // CSRF protection
  path: '/',
  maxAge: 7 * 24 * 60 * 60,  // 7 days
  domain: '.yourdomain.com'  // Allow subdomain access
});
```

### 5. Monitoring
- Log all auth failures
- Track token refresh rates
- Monitor for suspicious patterns (rapid refreshes, etc.)
- Alert on OAuth errors

## Files Reference

### Server
- `apps/@app/server/src/routes/auth.ts` - Authentication endpoints
- `apps/@app/server/src/lib/jwt.ts` - JWT generation and verification
- `apps/@app/server/src/config.ts` - Environment configuration
- `apps/@app/server/.env` - Environment variables (not committed)

### Client
- `apps/@app/client/src/lib/auth.ts` - Auth utility functions
- `apps/@app/client/src/lib/api-client.ts` - SDK setup and interceptors
- `apps/@app/client/src/app.tsx` - Main application component
- `apps/@app/client/src/components/debug-info.tsx` - Debug information display

### SDK
- `apps/@app/sdk/src/generated/` - Auto-generated TypeScript client
- `apps/@app/sdk/openapi-ts.config.ts` - SDK generation configuration
