export const jwtConstants = {
  secret: process.env.JWT_SECRET || (() => {
    const fallbackSecret = 'dev-secret-change-me-in-production';
    if (process.env.NODE_ENV === 'production') {
      console.warn('WARNING: Using fallback JWT secret in production. Set JWT_SECRET environment variable for security.');
    } else {
      console.warn('WARNING: Using default JWT secret for development. Set JWT_SECRET environment variable.');
    }
    return fallbackSecret;
  })(),
  signOptions: {
    expiresIn: '2h', // Token expiration
  },
};
