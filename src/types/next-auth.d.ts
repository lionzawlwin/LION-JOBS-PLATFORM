import type { StaffRole } from './index';

declare module 'next-auth' {
  interface Session {
    user?: {
      name?:     string | null;
      email?:    string | null;
      image?:    string | null;
      role?:     StaffRole;
      cseRepId?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?:     StaffRole;
    cseRepId?: string | null;
  }
}
