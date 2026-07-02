import { withAuth } from 'next-auth/middleware';

export const proxy = withAuth({
  callbacks: {
    // A token only exists here if authOptions.ts's signIn callback already
    // approved it (ADMIN_EMAIL or an active staff row) — role is attached
    // to every such token, so its presence is the authorization check.
    authorized({ token }) {
      return !!token?.role;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
