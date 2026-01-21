import { boolean, date, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const userSchema = pgTable('users', {
	id: serial('id').primaryKey(),

	telegramId: integer('telegram_id').unique().notNull(),
	firstName: text('first_name').notNull(),
	secondName: text('second_name'),
	nickname: text('nickname'),
	createdAt: date('created_at').defaultNow().notNull(),
	updatedAt: date('updated_at').defaultNow().notNull(),

	inWhitelist: boolean('in_whitelist').default(false).notNull(),

	// YClients auth
	yclientsUserToken: text('yclients_user_token'),
	yclientsUserId: integer('yclients_user_id'),
	yclientsPhone: text('yclients_phone'),
	yclientsEmail: text('yclients_email'),
});

export type UserSchema = typeof userSchema;

// Таблица для хранения записей, созданных через бота
export const bookingSchema = pgTable('bookings', {
	id: serial('id').primaryKey(),

	// Связь с пользователем
	userId: integer('user_id')
		.notNull()
		.references(() => userSchema.id),

	// ID записи в YClients
	yclientsRecordId: integer('yclients_record_id').notNull(),

	// Детали записи
	companyId: integer('company_id').notNull(),
	companyName: text('company_name').notNull(),
	serviceId: integer('service_id').notNull(),
	serviceName: text('service_name').notNull(),
	staffId: integer('staff_id'),
	staffName: text('staff_name'),
	datetime: timestamp('datetime', { withTimezone: true }).notNull(),

	// Статус записи
	status: text('status').notNull().default('active'), // active, cancelled, completed

	// Временные метки
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type BookingSchema = typeof bookingSchema;
