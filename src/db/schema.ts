import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const userSchema = pgTable("users", {
  id: serial("id").primaryKey(),

  telegramId: integer("telegram_id").unique().notNull(),
  firstName: text("first_name").notNull(),
  secondName: text("second_name"),
  nickname: text("nickname"),
  createdAt: date("created_at").defaultNow().notNull(),
  updatedAt: date("updated_at").defaultNow().notNull(),

  inWhitelist: boolean("in_whitelist").default(false).notNull(),

  // YClients auth
  yclientsUserToken: text("yclients_user_token"),
  yclientsUserId: integer("yclients_user_id"),
  yclientsPhone: text("yclients_phone"),
  yclientsEmail: text("yclients_email"),
});

export type UserSchema = typeof userSchema;
