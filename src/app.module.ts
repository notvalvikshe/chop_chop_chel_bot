import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BookingModule } from "./app/booking/booking.module";
import { BotModule } from "./app/bot/bot.module";
import { NotificationModule } from "./app/notification/notification.module";
import { UserModule } from "./app/user/user.module";
import { DBModule } from "./db/db.module";
import { Env, envSchema, validateSchema } from "./env.validator";
import { YClientsModule } from "./yclients/yclients.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => validateSchema<Env>(envSchema, config),
      isGlobal: true,
    }),
    YClientsModule,
    BotModule,
    DBModule,
    UserModule,
    BookingModule,
    NotificationModule,
  ],
})
export class AppModule {}
