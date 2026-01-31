import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DBService } from '../../db/db.service';
import { settingsSchema } from '../../db/schema';

export interface Setting {
	id: number;
	key: string;
	value: string;
	createdAt: Date;
	updatedAt: Date;
}

@Injectable()
export class SettingsRepository {
	constructor(private readonly db: DBService) {}

	async get(key: string): Promise<string | null> {
		const [setting] = await this.db.db.select().from(settingsSchema).where(eq(settingsSchema.key, key)).limit(1);

		return setting?.value || null;
	}

	async set(key: string, value: string): Promise<Setting> {
		const existing = await this.get(key);

		if (existing !== null) {
			const [updated] = await this.db.db
				.update(settingsSchema)
				.set({ value, updatedAt: new Date() })
				.where(eq(settingsSchema.key, key))
				.returning();
			return updated as Setting;
		}

		const [created] = await this.db.db.insert(settingsSchema).values({ key, value }).returning();
		return created as Setting;
	}

	async delete(key: string): Promise<void> {
		await this.db.db.delete(settingsSchema).where(eq(settingsSchema.key, key));
	}
}
