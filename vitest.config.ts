import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		pool: 'threads',
		maxWorkers: 4, // Limit to 2 workers to reduce memory usage
		env: {
			// Test environment variables
			NODE_ENV: 'test',
			STRIPE_SECRET_KEY: 'sk_test_mock_key_for_testing',
			STRIPE_WEBHOOK_SECRET: 'whsec_mock_secret_for_testing',
			NEXT_PUBLIC_URL: 'http://localhost:3000',
			NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock_key_for_testing',
			// Database connection for tests is handled in setup-db.ts
			// AWS SES credentials for tests
			AWS_ACCESS_KEY_ID: 'test_access_key',
			AWS_SECRET_ACCESS_KEY: 'test_secret_key',
			AWS_REGION: 'us-east-1',
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './'),
		},
	},
});
