import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateSchema, Env, envSchema } from './env.validator';
import { BotModule } from './app/bot/bot.module';
import { UserModule } from './app/user/user.module';
import { DBModule } from './db/db.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			validate: (config) => validateSchema<Env>(envSchema, config),
			isGlobal: true,
		}),
		BotModule,
		DBModule,
		UserModule,
	],
})
export class AppModule { }
