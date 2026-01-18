import { Update, Ctx, Start, InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { MyContext } from './helpers/bot-types';
import { UserService } from '../user/user.service';
import LocalSession from 'telegraf-session-local';
import { Logger } from '@nestjs/common';
import { LoggerMiddleware } from '../../middleware/logger.middleware';

@Update()
export class BotService {
	private readonly logger = new Logger(BotService.name);

	constructor(
		@InjectBot() private bot: Telegraf<MyContext>,
		readonly userService: UserService,
	) {
		this.bot.telegram.setMyCommands([{ command: '/start', description: 'Запуск бота' }]);
		this.bot.use(this.attachUserMiddleware());
		const loggerMiddleware = new LoggerMiddleware();
		this.bot.use(loggerMiddleware.middleware());
		this.bot.use(new LocalSession({ database: 'session.json' }).middleware());
	}

	private attachUserMiddleware() {
		return async (ctx: MyContext, next: () => Promise<void>) => {
			if (ctx.from) {
				const user = await this.userService.getUserByTelegramUser(ctx.from);
				ctx.user = user;
			}

			await next();
		};
	}

	@Start()
	async onStart(@Ctx() ctx: MyContext): Promise<void> {
		const name = ctx.user?.firstName || 'пользователь';
		await ctx.reply(`👋 Привет, ${name}! Бот работает.`);
	}
}
