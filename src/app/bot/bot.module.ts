import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { Env } from '../../env.validator';
import { UserModule } from '../user/user.module';

@Module({
	imports: [
		TelegrafModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService<Env, true>) => ({
				token: configService.get('TELEGRAM_TOKEN'),
			}),
			inject: [ConfigService],
		}),
		UserModule,
	],
	providers: [BotService],
})
export class BotModule { }
