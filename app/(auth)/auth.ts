import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getUserByEmail } from '@/lib/db/users';
import { authConfig } from './auth.config';

export const DUMMY_PASSWORD =
	'$2b$10$0000000000000000000000000000000000000000000000000000000';

export type UserType = 'guest' | 'regular';

declare module 'next-auth' {
	interface Session {
		user: {
			id: string;
			type: UserType;
			email: string;
			name?: string | null;
			image?: string | null;
		};
	}

	interface User {
		id?: string;
		email?: string | null;
		type: UserType;
	}
}

export const { handlers, auth, signIn, signOut } = NextAuth({
	...authConfig,
	providers: [
		Credentials({
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				if (!(credentials?.email && credentials?.password)) {
					return null;
				}

				const email = credentials.email as string;
				const password = credentials.password as string;

				const user = await getUserByEmail(email);

				if (!user) {
					await compare(password, DUMMY_PASSWORD);
					return null;
				}

				if (!user.hashedPassword) {
					await compare(password, DUMMY_PASSWORD);
					return null;
				}

				const passwordsMatch = await compare(password, user.hashedPassword);

				if (!passwordsMatch) return null;

				return {
					id: user.id,
					email: user.email,
					name: `${user.firstName} ${user.lastName}`,
					type: 'regular' as UserType,
				};
			},
		}),
	],
	callbacks: {
		...authConfig.callbacks,
		jwt({ token, user }) {
			if (user?.id) {
				token.id = user.id;
				token.type = user.type;
			}
			return token;
		},
		session({ session, token }) {
			if (session.user && token.id && token.type) {
				session.user.id = token.id as string;
				session.user.type = token.type as UserType;
			}
			return session;
		},
	},
});

export const { GET, POST } = handlers;
