import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isOnPing = nextUrl.pathname.startsWith('/ping');
      if (isOnPing) return new Response('pong', { status: 200 });
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname.startsWith('/chat');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnHome = nextUrl.pathname === '/';

      if (isOnChat) {
        if (isLoggedIn) return true;
        return false;
      }
      if (isOnLogin || isOnRegister) {
        if (isLoggedIn) return Response.redirect(new URL('/chat', nextUrl));
        return true;
      }
      if (isOnHome && isLoggedIn)
        return Response.redirect(new URL('/chat', nextUrl));
      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
