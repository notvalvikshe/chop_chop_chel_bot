import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { Env } from '../../env.validator';
import { BookingModule } from '../booking/booking.module';
import { UserModule } from '../user/user.module';
import { BotService } from './bot.service';
import { BookingScene } from './scenes/booking.scene';

@Module({
	imports: [
		TelegrafModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService<Env, true>) => {
				return {
					token: configService.get('TELEGRAM_TOKEN'),
					middlewares: [session()],
				};
			},
			inject: [ConfigService],
		}),
		UserModule,
		BookingModule,
	],
	providers: [BotService, BookingScene],
})
export class BotModule {}
