import { Logger } from '@nestjs/common';
import { Command, Ctx, Hears, InjectBot, On, Start, Update } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { LoggerMiddleware } from '../../middleware/logger.middleware';
import { BookingService } from '../booking/booking.service';
import { SettingsService } from '../settings/settings.service';
import { UserService } from '../user/user.service';
import { MyContext } from './helpers/bot-types';
import { mainMenuKeyboard } from './keyboards/main.keyboard';

@Update()
export class BotService {
	private readonly logger = new Logger(BotService.name);

	constructor(
		@InjectBot() private bot: Telegraf<MyContext>,
		readonly userService: UserService,
		readonly bookingService: BookingService,
		readonly settingsService: SettingsService,
	) {
		this.bot.telegram.setMyCommands([
			{ command: '/start', description: 'Запуск бота' },
			{ command: '/services', description: 'Список услуг и цен' },
			{ command: '/book', description: 'Записаться на стрижку' },
			{ command: '/my_bookings', description: 'Мои записи' },
			{ command: '/help', description: 'Помощь' },
		]);
		this.bot.use(this.attachUserMiddleware());
		const loggerMiddleware = new LoggerMiddleware();
		this.bot.use(loggerMiddleware.middleware());
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

	private async getKeyboardOptions() {
		const adminLink = await this.settingsService.getAdminChatLink();
		return { showAdminButton: !!adminLink };
	}

	@Start()
	async onStart(@Ctx() ctx: MyContext): Promise<void> {
		const name = ctx.user?.firstName || 'пользователь';
		const keyboardOptions = await this.getKeyboardOptions();
		await ctx.reply(
			`👋 Привет, ${name}!\n\nЯ бот для онлайн-записи на стрижку.\n\nВыбери действие в меню ниже или используй команды:\n/services - посмотреть услуги и цены\n/book - записаться на стрижку\n/my_bookings - посмотреть свои записи`,
			mainMenuKeyboard(keyboardOptions),
		);
	}

	@Command('services')
	@Hears('💇 Услуги и цены')
	async onServices(@Ctx() ctx: MyContext): Promise<void> {
		try {
			const services = await this.bookingService.getAvailableServices();

			if (services.length === 0) {
				await ctx.reply('К сожалению, пока нет доступных услуг.');
				return;
			}

			let message = '💇 <b>Наши услуги:</b>\n\n';
			for (const service of services) {
				const duration = Math.round(service.duration / 60);
				const priceRange =
					service.price_min === service.price_max ? `${service.price_min} ₽` : `${service.price_min}-${service.price_max} ₽`;

				message += `<b>${service.title}</b>\n`;
				message += `💰 ${priceRange}\n`;
				message += `⏱ ${duration} мин\n\n`;
			}

			await ctx.reply(message, { parse_mode: 'HTML', ...mainMenuKeyboard() });
		} catch (error) {
			this.logger.error('Failed to fetch services', error);
			await ctx.reply('Произошла ошибка при загрузке услуг. Попробуйте позже.');
		}
	}

	@Command('book')
	@Hears('📅 Записаться')
	async onBook(@Ctx() ctx: MyContext): Promise<void> {
		await ctx.scene.enter('BOOKING_SCENE');
	}

	@Command('my_bookings')
	@Hears('📋 Мои записи')
	async onMyBookings(@Ctx() ctx: MyContext): Promise<void> {
		try {
			const records = await this.bookingService.getUserBookings(ctx.user.id);

			if (records.length === 0) {
				await ctx.reply('У вас пока нет активных записей.', mainMenuKeyboard());
				return;
			}

			let message = '📋 <b>Ваши записи:</b>\n\n';
			for (const record of records) {
				const date = new Date(record.datetime);
				const dateStr = date.toLocaleDateString('ru-RU');
				const timeStr = date.toLocaleTimeString('ru-RU', {
					hour: '2-digit',
					minute: '2-digit',
				});

				message += `<b>${record.services.map((s) => s.title).join(', ')}</b>\n`;
				message += `📅 ${dateStr} в ${timeStr}\n`;

				// Добавляем мастера, если есть
				if (record.staff_name) {
					message += `👨‍💼 Мастер: ${record.staff_name}\n`;
				}

				// Добавляем филиал, если есть
				if (record.company_name) {
					message += `🏢 Филиал: ${record.company_name}\n`;
				}

				if (record.comment) {
					message += `💬 ${record.comment}\n`;
				}
				message += '\n';
			}

			await ctx.reply(message, { parse_mode: 'HTML', ...mainMenuKeyboard() });
		} catch (error) {
			this.logger.error('Failed to fetch user bookings', error);
			await ctx.reply('Произошла ошибка при загрузке записей. Попробуйте позже.', mainMenuKeyboard());
		}
	}

	@Command('help')
	@Hears('ℹ️ Помощь')
	async onHelp(@Ctx() ctx: MyContext): Promise<void> {
		const keyboardOptions = await this.getKeyboardOptions();
		await ctx.reply(
			'ℹ️ <b>Помощь по боту</b>\n\n' +
				'<b>Доступные команды:</b>\n' +
				'/services - посмотреть услуги и цены\n' +
				'/book - записаться на стрижку\n' +
				'/my_bookings - посмотреть свои записи\n' +
				'/help - эта справка\n\n' +
				'Также можно использовать кнопки в меню.',
			{ parse_mode: 'HTML', ...mainMenuKeyboard(keyboardOptions) },
		);
	}

	@Hears('📞 Позвать админа')
	async onCallAdmin(@Ctx() ctx: MyContext): Promise<void> {
		const adminLink = await this.settingsService.getAdminChatLink();
		const keyboardOptions = await this.getKeyboardOptions();

		if (!adminLink) {
			await ctx.reply('К сожалению, связь с админом временно недоступна.', mainMenuKeyboard(keyboardOptions));
			return;
		}

		await ctx.reply(`📞 Для связи с администратором перейдите по ссылке:\n\n${adminLink}`, mainMenuKeyboard(keyboardOptions));
	}

	@On('text')
	async onUnknownMessage(@Ctx() ctx: MyContext): Promise<void> {
		const keyboardOptions = await this.getKeyboardOptions();
		const adminLink = await this.settingsService.getAdminChatLink();

		let message =
			'🤔 Не понял команду. Вот что я умею:\n\n' +
			'<b>Доступные команды:</b>\n' +
			'/start - запустить бота\n' +
			'/services - посмотреть услуги и цены\n' +
			'/book - записаться на стрижку\n' +
			'/my_bookings - посмотреть свои записи\n' +
			'/help - помощь\n\n' +
			'Также можно использовать кнопки в меню.';

		if (adminLink) {
			message += `\n\n📞 Связаться с админом: ${adminLink}`;
		}

		await ctx.reply(message, { parse_mode: 'HTML', ...mainMenuKeyboard(keyboardOptions) });
	}
}
