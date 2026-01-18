import { boolean, integer, pgTable, serial, text, date } from 'drizzle-orm/pg-core';

export const userSchema = pgTable('users', {
	id: serial('id').primaryKey(),

	telegramId: integer('telegram_id').unique().notNull(),
	firstName: text('first_name').notNull(),
	secondName: text('second_name'),
	nickname: text('nickname'),
	createdAt: date('created_at').defaultNow().notNull(),
	updatedAt: date('updated_at').defaultNow().notNull(),

	inWhitelist: boolean('in_whitelist').default(false).notNull(),
});
