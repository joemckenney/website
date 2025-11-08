export const config = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
  },
  allowedEmail: process.env.ALLOWED_EMAIL || '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessTokenExpiry: '15m' as const, // 15 minutes
    refreshTokenExpiry: '7d' as const, // 7 days
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
};
