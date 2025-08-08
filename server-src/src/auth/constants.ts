export const jwtConstants = {
  secret: (() => {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'CRITICAL: JWT_SECRET environment variable is required in production. Application cannot start without it.',
        );
      }
      console.warn(
        'WARNING: JWT_SECRET not found. Using development fallback. This is only safe for development.',
      );
      return 'dev-secret-change-me-in-production';
    }

    // Basic validation for JWT secret strength
    if (jwtSecret.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'CRITICAL: JWT_SECRET must be at least 32 characters long for production security.',
        );
      }
      console.warn(
        'WARNING: JWT_SECRET should be at least 32 characters long for better security.',
      );
    }

    return jwtSecret;
  })(),
  signOptions: {
    expiresIn: '2h', // Token expiration
    issuer: 'brutal-patches-api',
    audience: 'brutal-patches-client',
  },
  refreshTokenOptions: {
    expiresIn: '7d', // Refresh token expiration
    issuer: 'brutal-patches-api',
    audience: 'brutal-patches-client',
  },
};
