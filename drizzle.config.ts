import { homedir } from 'node:os';
import { join } from 'node:path';
import { env } from 'node:process';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/db/schema.ts', // Файл схемы
	out: './migration', // Каталог для миграций
	dialect: 'postgresql',
	dbCredentials: { url: env.DATABASE_URL as string },
	migrations: {
		table: 'migrations',
		schema: 'public',
	},
});
