import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { objectify } from 'radash';
import { User as TelegramUser } from 'typegram';
import type { ExtendedAppointment } from '../../yclients/yclients.types';
import { BookingService } from '../booking/booking.service';
import { User } from './user';
import { FindUsersResult, PaginationOptions, UserFilters, UserRepository } from './user.repository';

export enum ResultType {
	Dictionary = 'dictionary',
	Array = 'array',
}

type ResultFormatOptions = {
	resultType: ResultType;
};

export interface UserWithBookings {
	user: User;
	bookings: ExtendedAppointment[];
}

@Injectable()
export class UserService {
	constructor(
		readonly repository: UserRepository,
		@Inject(forwardRef(() => BookingService))
		private readonly bookingService: BookingService,
	) {}

	public async getUserByTelegramUser({ id, first_name, last_name, username }: TelegramUser): Promise<User> {
		const user = await this.repository.findByTelegramId(id);
		return user ?? this.repository.create({ telegramId: id, firstName: first_name, secondName: last_name, nickname: username });
	}

	public async getUserById(id: number): Promise<User | null> {
		return this.repository.findById(id);
	}

	public async getUserByIds(ids: number[], options?: { resultType: ResultType.Array }): Promise<User[]>;
	public async getUserByIds(ids: number[], options?: { resultType: ResultType.Dictionary }): Promise<Record<number, User>>;
	public async getUserByIds(
		ids: number[],
		options: ResultFormatOptions = { resultType: ResultType.Array },
	): Promise<User[] | Record<number, User>> {
		const users = await this.repository.findByIds(ids);

		switch (options.resultType) {
			case ResultType.Dictionary:
				return objectify<User, number>(users, (user) => user.id);
			case 'array':
				return users;
			default:
				throw new Error(`Unknown resultType: ${options.resultType}`);
		}
	}

	/**
	 * Получить список пользователей с фильтрами и пагинацией
	 */
	public async getUsers(filters: UserFilters = {}, pagination: PaginationOptions = {}): Promise<FindUsersResult> {
		return this.repository.findWithFilters(filters, pagination);
	}

	/**
	 * Получить всех пользователей
	 */
	public async getAllUsers(): Promise<User[]> {
		return this.repository.findAll();
	}

	/**
	 * Получить пользователя с его записями
	 */
	public async getUserWithBookings(userId: number): Promise<UserWithBookings | null> {
		const user = await this.repository.findById(userId);
		if (!user) {
			return null;
		}

		const bookings = await this.bookingService.getUserBookings(userId);

		return {
			user,
			bookings,
		};
	}

	/**
	 * Получить записи пользователя по ID
	 */
	public async getUserBookings(userId: number): Promise<ExtendedAppointment[]> {
		return this.bookingService.getUserBookings(userId);
	}

	/**
	 * Получить записи пользователя по Telegram ID
	 */
	public async getUserBookingsByTelegramId(telegramId: number): Promise<ExtendedAppointment[]> {
		const user = await this.repository.findByTelegramId(telegramId);
		if (!user) {
			return [];
		}

		return this.bookingService.getUserBookings(user.id);
	}
}
