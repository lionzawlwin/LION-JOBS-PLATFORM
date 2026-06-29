import { withAuth } from 'next-auth/middleware';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export default withAuth({
  callbacks: {
    authorized({ token }) {
      // Only the admin email can access /dashboard
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
