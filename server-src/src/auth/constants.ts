export const jwtConstants = {
  secret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    console.warn('WARNING: Using default JWT secret for development. Set JWT_SECRET environment variable.');
    return 'dev-secret-change-me-in-production';
  })(),
  signOptions: {
    expiresIn: '24h', // Add token expiration
  },
};
