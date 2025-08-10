export const environment = {
  production: true,
  apiUrl: 'https://api.brutalpatches.com',
  jwt: {
    secret: process.env['JWT_SECRET'] || '', // Should be set via environment variables
    issuer: 'brutal-patches',
    audience: 'brutal-patches-users'
  },
  security: {
    adminUsernames: process.env['ADMIN_USERNAMES']?.split(',') || ['admin'],
    adminAccessRateLimit: {
      maxAttempts: 3, // Stricter in production
      windowMs: 15 * 60 * 1000 // 15 minutes
    }
  }
};
