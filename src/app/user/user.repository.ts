import { Injectable } from '@nestjs/common';
import { SQL, and, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';
import { DBService } from '../../db/db.service';
import { userSchema } from '../../db/schema';
import { User } from './user';

export interface UserFilters {
	id?: number;
	telegramId?: number;
	firstName?: string;
	secondName?: string;
	nickname?: string;
	inWhitelist?: boolean;
	yclientsUserId?: number;
	yclientsPhone?: string;
	yclientsEmail?: string;
	search?: string; // Поиск по firstName, secondName, nickname
	createdFrom?: Date;
	createdTo?: Date;
}

export interface PaginationOptions {
	limit?: number;
	offset?: number;
}

export interface FindUsersResult {
	users: User[];
	total: number;
}

@Injectable()
export class UserRepository {
	constructor(private dbService: DBService) {}

	public async create(userCreateData: {
		telegramId: number;
		firstName: string;
		nickname?: string;
		secondName?: string;
	}): Promise<User> {
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

	public async updateYClientsAuth(userId: number, userToken: string, yclientsUserId: number, phone: string): Promise<User | null> {
		const model = await this.dbService.db
			.update(userSchema)
			.set({
				yclientsUserToken: userToken,
				yclientsUserId: yclientsUserId,
				yclientsPhone: phone,
			})
			.where(eq(userSchema.id, userId))
			.returning();
		return model.length ? new User(model[0]) : null;
	}

	public async updateContactInfo(userId: number, phone: string, email: string): Promise<User | null> {
		const model = await this.dbService.db
			.update(userSchema)
			.set({
				yclientsPhone: phone,
				yclientsEmail: email,
			})
			.where(eq(userSchema.id, userId))
			.returning();
		return model.length ? new User(model[0]) : null;
	}

	/**
	 * Найти пользователей с фильтрами и пагинацией
	 */
	public async findWithFilters(filters: UserFilters = {}, pagination: PaginationOptions = {}): Promise<FindUsersResult> {
		const conditions: SQL[] = [];

		if (filters.id !== undefined) {
			conditions.push(eq(userSchema.id, filters.id));
		}

		if (filters.telegramId !== undefined) {
			conditions.push(eq(userSchema.telegramId, filters.telegramId));
		}

		if (filters.firstName) {
			conditions.push(ilike(userSchema.firstName, `%${filters.firstName}%`));
		}

		if (filters.secondName) {
			conditions.push(ilike(userSchema.secondName, `%${filters.secondName}%`));
		}

		if (filters.nickname) {
			conditions.push(ilike(userSchema.nickname, `%${filters.nickname}%`));
		}

		if (filters.inWhitelist !== undefined) {
			conditions.push(eq(userSchema.inWhitelist, filters.inWhitelist));
		}

		if (filters.yclientsUserId !== undefined) {
			conditions.push(eq(userSchema.yclientsUserId, filters.yclientsUserId));
		}

		if (filters.yclientsPhone) {
			conditions.push(ilike(userSchema.yclientsPhone, `%${filters.yclientsPhone}%`));
		}

		if (filters.yclientsEmail) {
			conditions.push(ilike(userSchema.yclientsEmail, `%${filters.yclientsEmail}%`));
		}

		if (filters.search) {
			const searchPattern = `%${filters.search}%`;
			conditions.push(
				or(
					ilike(userSchema.firstName, searchPattern),
					ilike(userSchema.secondName, searchPattern),
					ilike(userSchema.nickname, searchPattern),
				) as SQL,
			);
		}

		if (filters.createdFrom) {
			conditions.push(gte(userSchema.createdAt, filters.createdFrom.toISOString().split('T')[0]));
		}

		if (filters.createdTo) {
			conditions.push(lte(userSchema.createdAt, filters.createdTo.toISOString().split('T')[0]));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// Получаем общее количество
		const countResult = await this.dbService.db.select({ count: userSchema.id }).from(userSchema).where(whereClause);

		const total = countResult.length;

		// Получаем пользователей с пагинацией
		let query = this.dbService.db.select().from(userSchema).where(whereClause).$dynamic();

		if (pagination.limit !== undefined) {
			query = query.limit(pagination.limit);
		}

		if (pagination.offset !== undefined) {
			query = query.offset(pagination.offset);
		}

		const model = await query;
		const users = model.map((item) => new User(item));

		return { users, total };
	}

	/**
	 * Получить всех пользователей
	 */
	public async findAll(): Promise<User[]> {
		const model = await this.dbService.db.select().from(userSchema);
		return model.map((item) => new User(item));
	}
}
