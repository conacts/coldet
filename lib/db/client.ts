// lib/db/client.ts
import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const pgUrl = process.env.DATABASE_URL ?? (() => {
	throw new Error('Missing DATABASE_URL environment variable');
})();

const client = postgres(pgUrl, {
	max: 1,
	idle_timeout: 20,
	connect_timeout: 10,
});

export const db = drizzle(client);