export const environment = {
  production: true,
  apiUrl: 'https://api.brutalpatches.com',
  jwt: {
    secret: '', // JWT secret is handled by backend, not needed in frontend
    issuer: 'brutal-patches',
    audience: 'brutal-patches-users'
  },
  security: {
    adminUsernames: ['admin'], // Default admin usernames for frontend display
    adminAccessRateLimit: {
      maxAttempts: 3, // Stricter in production
      windowMs: 15 * 60 * 1000 // 15 minutes
    }
  }
};
