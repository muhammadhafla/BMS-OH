import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { User as NextAuthUser } from 'next-auth';

// User type that matches our backend
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  branchId?: string;
  branch?: {
    id: string;
    name: string;
  };
}

// Extended user type for NextAuth
export interface ExtendedUser extends NextAuthUser {
  id: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  branchId?: string;
  branch?: {
    id: string;
    name: string;
  };
}

// Backend API response types
export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  error?: string;
}

export interface UserResponse {
  success: boolean;
  data: {
    user: User;
  };
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data: LoginResponse = await response.json();

          if (data.success && data.data.user && data.data.token) {
            const { user } = data.data;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              branchId: user.branchId,
              branch: user.branch,
            };
          } else {
            throw new Error(data.error || 'Invalid credentials');
          }
        } catch (error) {
          throw new Error('Network error. Please check your connection.');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial login
        token.user = user as ExtendedUser;
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        token.user = { ...token.user, ...session } as ExtendedUser;
      }

      // Check if token is close to expiring and refresh if needed
      if (token.exp && Date.now() / 1000 > token.exp - 60) { // Refresh 1 minute before expiry
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          });

          if (response.ok) {
            const data: UserResponse = await response.json();
            if (data.success) {
              token.user = data.data.user;
            }
          }
        } catch (error) {
          // Token refresh failed, user will be logged out
          token.error = 'Token refresh failed';
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.user) {
        const { user } = token as { user: ExtendedUser };
        const sessionUser = {
          id: user.id,
          email: user.email || '',
          name: user.name || '',
          role: user.role,
        } as any;
        
        // Only add optional properties if they exist
        if (user.branchId) {
          sessionUser.branchId = user.branchId;
        }
        if (user.branch) {
          sessionUser.branch = user.branch;
        }
        
        session.user = sessionUser;
      }
      
      return session;
    },
    async signIn() {
      // Additional sign-in validation if needed
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      // Clean up server-side session if needed
      if (token?.accessToken) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          });
        } catch (error) {
          // Ignore logout errors
        }
      }
    },
  },
};

export default NextAuth(authOptions);

// JWT token interface for TypeScript
declare module 'next-auth/jwt' {
  interface JWT {
    user?: ExtendedUser;
    accessToken?: string;
    error?: string;
    exp?: number;
  }
}

// Session interface extension
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'ADMIN' | 'MANAGER' | 'STAFF';
      branchId?: string;
      branch?: {
        id: string;
        name: string;
      };
    };
  }
}