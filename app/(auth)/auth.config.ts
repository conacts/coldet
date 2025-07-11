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
		authorized({ auth: authData, request: { nextUrl } }) {
			const isOnPing = nextUrl.pathname.startsWith('/ping');
			if (isOnPing) return true;

			const isLoggedIn = !!authData?.user;
			const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
			const isOnLogin = nextUrl.pathname.startsWith('/login');
			const isOnRegister = nextUrl.pathname.startsWith('/register');
			const isOnHome = nextUrl.pathname === '/';

			if (isOnDashboard) {
				if (isLoggedIn) return true;
				return false;
			}
			if (isOnLogin || isOnRegister) {
				if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl));
				return true;
			}
			if (isOnHome && isLoggedIn)
				return Response.redirect(new URL('/dashboard', nextUrl));
			return true;
		},
	},
	trustHost: true,
} satisfies NextAuthConfig; 