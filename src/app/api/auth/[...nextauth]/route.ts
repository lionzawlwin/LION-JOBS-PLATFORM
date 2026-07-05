// PUBLIC ROUTE: NextAuth's own handler -- auth is enforced inside
// authOptions.ts's callbacks, not by a guard at this route level.
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
