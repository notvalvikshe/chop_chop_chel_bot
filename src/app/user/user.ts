import { InferSelectModel } from 'drizzle-orm';
import { userSchema } from '../../db/schema';

export type UserSchemaType = InferSelectModel<typeof userSchema>;

export class User {
	readonly id: number;
	readonly telegramId: number;

	readonly firstName: string;
	readonly secondName?: string;
	readonly nickname?: string;

	readonly createdAt: Date;
	readonly updatedAt: Date;

	readonly inWhitelist: boolean;

	constructor(dbModel: UserSchemaType) {
		this.id = dbModel.id;
		this.telegramId = dbModel.telegramId;

		this.firstName = dbModel.firstName;
		this.secondName = dbModel.secondName ?? undefined;
		this.nickname = dbModel.nickname ?? undefined;

		this.updatedAt = new Date(dbModel.updatedAt);
		this.createdAt = new Date(dbModel.createdAt);

		this.inWhitelist = dbModel.inWhitelist;
	}

	get name(): string {
		if (this.nickname) {
			return this.nickname;
		}
		return this.secondName ? `${this.firstName} ${this.secondName}` : this.firstName;
	}
}
