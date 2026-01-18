import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User as TelegramUser } from 'typegram';
import { User } from './user';
import { objectify } from 'radash';

export enum ResultType {
	Dictionary = 'dictionary',
	Array = 'array',
}

type ResultFormatOptions = {
	resultType: ResultType;
};

@Injectable()
export class UserService {
	constructor(readonly repository: UserRepository) { }

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
}
