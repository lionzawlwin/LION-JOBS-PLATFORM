import { withAuth } from 'next-auth/middleware';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export const proxy = withAuth({
  callbacks: {
    authorized({ token }) {
      return token?.email === ADMIN_EMAIL;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
