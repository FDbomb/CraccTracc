import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  //baseURL: process.env.NEXT_PUBLIC_AUTH_BASE_URL || 'http://localhost:3000',
  //plugins: [],
});
