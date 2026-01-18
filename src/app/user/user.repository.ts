import { Injectable } from '@nestjs/common';
import { User } from './user';
import { DBService } from '../../db/db.service';
import { userSchema } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';

@Injectable()
export class UserRepository {
	constructor(private dbService: DBService) { }

	public async create(userCreateData: { telegramId: number; firstName: string; nickname?: string; secondName?: string }): Promise<User> {
		const model = await this.dbService.db
			.insert(userSchema)
			.values({
				firstName: userCreateData.firstName,
				telegramId: userCreateData.telegramId,
				nickname: userCreateData.nickname,
				secondName: userCreateData.secondName,
			})
			.onConflictDoUpdate({
				set: {
					firstName: userCreateData.firstName,
					nickname: userCreateData.nickname,
					secondName: userCreateData.secondName,
				},
				target: userSchema.telegramId,
			})
			.returning();
		return new User(model[0]);
	}

	public async findByTelegramId(telegramId: number): Promise<User | null> {
		const model = await this.dbService.db.select().from(userSchema).where(eq(userSchema.telegramId, telegramId)).limit(1);
		return model.length ? new User(model[0]) : null;
	}

	public async findById(id: number): Promise<User | null> {
		const model = await this.dbService.db.select().from(userSchema).where(eq(userSchema.id, id)).limit(1);
		return model.length ? new User(model[0]) : null;
	}

	public async findByIds(ids: number[]): Promise<User[]> {
		const model = await this.dbService.db.select().from(userSchema).where(inArray(userSchema.id, ids));
		return model.length ? model.map((item) => new User(item)) : [];
	}
}
