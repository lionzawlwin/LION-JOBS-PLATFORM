import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getStaffByEmail } from '@/lib/db';
import type { StaffRole } from '@/types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      // Permanent safety net, not a transitional shim: ADMIN_EMAIL always
      // works regardless of the staff table's state, so a missing/misconfigured
      // staff row (or the seed migration never having run in some environment)
      // can never lock out the account this whole auth system originally
      // belonged to.
      if (user.email === ADMIN_EMAIL) return true;
      const staffMember = await getStaffByEmail(user.email);
      return !!staffMember?.active;
    },
    async jwt({ token, user }) {
      // `user` is only populated on the initial sign-in call, not on every
      // subsequent token read — so this DB lookup runs once per login, not
      // once per request. Role/CSE-link changes made in the Team & Access
      // tab take effect on that staff member's next sign-in, not immediately.
      if (user?.email) {
        const staffMember = await getStaffByEmail(user.email);
        token.role = staffMember?.role ?? (user.email === ADMIN_EMAIL ? 'owner' : 'viewer');
        token.cseRepId = staffMember?.cseRepId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as StaffRole | undefined) ?? 'viewer';
        session.user.cseRepId = token.cseRepId ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn:  '/login',
    error:   '/login',
  },
};
