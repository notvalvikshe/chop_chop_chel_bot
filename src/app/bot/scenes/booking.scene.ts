import { Injectable, Logger } from "@nestjs/common";
import { Action, Ctx, On, Scene, SceneEnter } from "nestjs-telegraf";
import { Markup } from "telegraf";
import type { Service, Staff } from "../../../yclients/yclients.types";
import { BookingService } from "../../booking/booking.service";
import { UserRepository } from "../../user/user.repository";
import type { MyContext } from "../helpers/bot-types";
import { mainMenuKeyboard } from "../keyboards/main.keyboard";

export const BOOKING_SCENE_ID = "BOOKING_SCENE";

@Injectable()
@Scene(BOOKING_SCENE_ID)
export class BookingScene {
  private readonly logger = new Logger(BookingScene.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly userRepository: UserRepository,
  ) {}

  @SceneEnter()
  async onEnter(@Ctx() ctx: MyContext): Promise<void> {
    // Инициализируем состояние бронирования
    ctx.scene.session.booking = {
      serviceId: undefined,
      staffId: undefined,
      datetime: undefined,
    };

    await this.showServices(ctx);
  }

  private async showServices(@Ctx() ctx: MyContext): Promise<void> {
    try {
      const services = await this.bookingService.getAvailableServices();

      if (services.length === 0) {
        await ctx.reply(
          "К сожалению, нет доступных услуг.",
          mainMenuKeyboard(),
        );
        await ctx.scene.leave();
        return;
      }

      // Сохраняем услуги в сессии для последующего использования
      ctx.scene.session.services = services;

      // Создаем inline кнопки для услуг (по 1 в ряду)
      const buttons = services.map((service: Service) => {
        const duration = Math.round(service.duration / 60);
        const priceRange =
          service.price_min === service.price_max
            ? `${service.price_min}₽`
            : `${service.price_min}-${service.price_max}₽`;
        return [
          Markup.button.callback(
            `${service.title} (${priceRange}, ${duration}мин)`,
            `service_${service.id}`,
          ),
        ];
      });

      // Добавляем кнопку отмены
      buttons.push([Markup.button.callback("❌ Отмена", "cancel")]);

      await ctx.reply("💇 Выберите услугу:", Markup.inlineKeyboard(buttons));
    } catch (error) {
      this.logger.error("Failed to load services", error);
      await ctx.reply(
        "Ошибка при загрузке услуг. Попробуйте позже.",
        mainMenuKeyboard(),
      );
      await ctx.scene.leave();
    }
  }

  @Action(/service_(\d+)/)
  async onServiceSelected(@Ctx() ctx: MyContext): Promise<void> {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

    const serviceId = Number.parseInt(ctx.callbackQuery.data.split("_")[1]);
    ctx.scene.session.booking.serviceId = serviceId;

    const selectedService = ctx.scene.session.services?.find(
      (s: Service) => s.id === serviceId,
    );
    if (selectedService) {
      await ctx.answerCbQuery(`Выбрана услуга: ${selectedService.title}`);
    }

    await this.showStaff(ctx, serviceId);
  }

  private async showStaff(
    @Ctx() ctx: MyContext,
    serviceId: number,
  ): Promise<void> {
    try {
      const staff = await this.bookingService.getStaffForService(serviceId);

      if (staff.length === 0) {
        await ctx.reply(
          "К сожалению, нет свободных мастеров для этой услуги.",
          mainMenuKeyboard(),
        );
        await ctx.scene.leave();
        return;
      }

      ctx.scene.session.staff = staff;

      const buttons = [
        [Markup.button.callback("👤 Любой мастер", "staff_any")],
        ...staff.map((s: Staff) => [
          Markup.button.callback(`👨‍💼 ${s.name}`, `staff_${s.id}`),
        ]),
        [
          Markup.button.callback("⬅️ Назад", "back_to_services"),
          Markup.button.callback("❌ Отмена", "cancel"),
        ],
      ];

      await ctx.editMessageText(
        "👨‍💼 Выберите мастера:",
        Markup.inlineKeyboard(buttons),
      );
    } catch (error) {
      this.logger.error("Failed to load staff", error);
      await ctx.reply(
        "Ошибка при загрузке мастеров. Попробуйте позже.",
        mainMenuKeyboard(),
      );
      await ctx.scene.leave();
    }
  }

  @Action(/staff_(\w+)/)
  async onStaffSelected(@Ctx() ctx: MyContext): Promise<void> {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

    const staffData = ctx.callbackQuery.data.split("_")[1];
    const staffId =
      staffData === "any" ? undefined : Number.parseInt(staffData);
    ctx.scene.session.booking.staffId = staffId;

    if (staffId) {
      const selectedStaff = ctx.scene.session.staff?.find(
        (s: Staff) => s.id === staffId,
      );
      if (selectedStaff) {
        await ctx.answerCbQuery(`Выбран мастер: ${selectedStaff.name}`);
      }
    } else {
      await ctx.answerCbQuery("Выбран любой свободный мастер");
    }

    await this.showDates(ctx);
  }

  private async showDates(@Ctx() ctx: MyContext): Promise<void> {
    const today = new Date();
    const dates = [];

    // Генерируем ближайшие 7 дней
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    const buttons = dates.map((date) => {
      const dateStr = date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        weekday: "short",
      });
      const isoDate = date.toISOString().split("T")[0];
      return [Markup.button.callback(dateStr, `date_${isoDate}`)];
    });

    buttons.push([
      Markup.button.callback("⬅️ Назад", "back_to_staff"),
      Markup.button.callback("❌ Отмена", "cancel"),
    ]);

    await ctx.editMessageText(
      "📅 Выберите дату:",
      Markup.inlineKeyboard(buttons),
    );
  }

  @Action(/date_(.+)/)
  async onDateSelected(@Ctx() ctx: MyContext): Promise<void> {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

    const dateStr = ctx.callbackQuery.data.split("_")[1];
    ctx.scene.session.booking.selectedDate = dateStr;

    await ctx.answerCbQuery(
      `Выбрана дата: ${new Date(dateStr).toLocaleDateString("ru-RU")}`,
    );
    await this.showTimes(ctx, dateStr);
  }

  private async showTimes(@Ctx() ctx: MyContext, date: string): Promise<void> {
    try {
      const { serviceId, staffId } = ctx.scene.session.booking;

      if (!serviceId) {
        await ctx.reply("Ошибка: услуга не выбрана", mainMenuKeyboard());
        await ctx.scene.leave();
        return;
      }

      const times = await this.bookingService.getAvailableSlots(
        serviceId,
        staffId,
        date,
      );

      if (times.length === 0) {
        await ctx.editMessageText(
          "К сожалению, на эту дату нет свободных слотов.",
          Markup.inlineKeyboard([
            [
              Markup.button.callback("⬅️ Назад к датам", "back_to_dates"),
              Markup.button.callback("❌ Отмена", "cancel"),
            ],
          ]),
        );
        return;
      }

      // Группируем время по 3 кнопки в ряд
      const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
      for (let i = 0; i < times.length; i += 3) {
        const row = times.slice(i, i + 3).map((slot) => {
          // slot.time уже в формате "14:30"
          return Markup.button.callback(slot.time, `time_${slot.datetime}`);
        });
        buttons.push(row);
      }

      buttons.push([
        Markup.button.callback("⬅️ Назад", "back_to_dates"),
        Markup.button.callback("❌ Отмена", "cancel"),
      ]);

      await ctx.editMessageText(
        "⏰ Выберите время:",
        Markup.inlineKeyboard(buttons),
      );
    } catch (error) {
      this.logger.error("Failed to load time slots", error);
      await ctx.reply(
        "Ошибка при загрузке свободных слотов.",
        mainMenuKeyboard(),
      );
      await ctx.scene.leave();
    }
  }

  @Action(/time_(.+)/)
  async onTimeSelected(@Ctx() ctx: MyContext): Promise<void> {
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

    const datetime = ctx.callbackQuery.data.split("_")[1];
    ctx.scene.session.booking.datetime = datetime;

    const timeStr = new Date(datetime).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    await ctx.answerCbQuery(`Выбрано время: ${timeStr}`);

    // Проверяем, есть ли у пользователя сохраненные контактные данные
    if (!ctx.user.yclientsPhone || !ctx.user.yclientsEmail) {
      await this.requestContactInfo(ctx);
    } else {
      await this.showConfirmation(ctx);
    }
  }

  private async requestContactInfo(@Ctx() ctx: MyContext): Promise<void> {
    if (!ctx.user.yclientsPhone) {
      ctx.scene.session.booking.awaitingPhone = true;
      await ctx.editMessageText(
        "📱 Для создания записи необходим ваш номер телефона.\n\n" +
          "Введите номер в формате: +79991234567 или 89991234567",
        Markup.inlineKeyboard([
          [Markup.button.callback("❌ Отмена", "cancel")],
        ]),
      );
    } else if (!ctx.user.yclientsEmail) {
      ctx.scene.session.booking.awaitingEmail = true;
      await ctx.editMessageText(
        "📧 Для создания записи необходим ваш email.\n\n" + "Введите email:",
        Markup.inlineKeyboard([
          [Markup.button.callback("❌ Отмена", "cancel")],
        ]),
      );
    }
  }

  @On("text")
  async onText(@Ctx() ctx: MyContext): Promise<void> {
    if (!ctx.message || !("text" in ctx.message)) return;

    const text = ctx.message.text;

    // Если пользователь нажимает кнопку главного меню - выходим из сцены и выполняем действие
    if (text === "💇 Услуги и цены") {
      await ctx.scene.leave();
      await this.showServicesInfo(ctx);
      return;
    }

    if (text === "📋 Мои записи") {
      await ctx.scene.leave();
      await this.showMyBookings(ctx);
      return;
    }

    if (text === "📅 Записаться") {
      // Если уже в сцене записи, просто начинаем заново
      await ctx.scene.reenter();
      return;
    }

    if (text === "ℹ️ Помощь") {
      await ctx.scene.leave();
      await this.showHelp(ctx);
      return;
    }

    // Обработка ввода телефона
    if (ctx.scene.session.booking.awaitingPhone) {
      const phoneRegex = /^(\+7|8|7)?(\d{10})$/;
      const match = text.replace(/[\s\-\(\)]/g, "").match(phoneRegex);

      if (!match) {
        await ctx.reply(
          "❌ Неверный формат телефона. Введите номер в формате: +79991234567 или 89991234567",
        );
        return;
      }

      const phone = `7${match[2]}`;
      ctx.scene.session.booking.phone = phone;
      ctx.scene.session.booking.awaitingPhone = false;

      // Проверяем, нужен ли email
      if (!ctx.user.yclientsEmail) {
        ctx.scene.session.booking.awaitingEmail = true;
        await ctx.reply(
          "✅ Телефон сохранен!\n\n" + "📧 Теперь введите ваш email:",
        );
      } else {
        // Сохраняем телефон и показываем подтверждение
        const updatedUser = await this.userRepository.updateContactInfo(
          ctx.user.id,
          phone,
          ctx.user.yclientsEmail,
        );
        if (updatedUser) {
          ctx.user = updatedUser;
        }
        await ctx.reply("✅ Телефон сохранен!");
        await this.showConfirmation(ctx);
      }
      return;
    }

    // Обработка ввода email
    if (ctx.scene.session.booking.awaitingEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(text)) {
        await ctx.reply("❌ Неверный формат email. Попробуйте еще раз.");
        return;
      }

      ctx.scene.session.booking.email = text;
      ctx.scene.session.booking.awaitingEmail = false;

      // Сохраняем контактные данные
      const phone =
        ctx.scene.session.booking.phone || ctx.user.yclientsPhone || "";
      const updatedUser = await this.userRepository.updateContactInfo(
        ctx.user.id,
        phone,
        text,
      );
      if (updatedUser) {
        ctx.user = updatedUser;
      }

      await ctx.reply("✅ Email сохранен!");
      await this.showConfirmation(ctx);
      return;
    }
  }

  private async showConfirmation(@Ctx() ctx: MyContext): Promise<void> {
    const { serviceId, staffId, datetime } = ctx.scene.session.booking;

    if (!datetime) {
      await ctx.reply("Ошибка: время не выбрано", mainMenuKeyboard());
      await ctx.scene.leave();
      return;
    }

    const selectedService = ctx.scene.session.services?.find(
      (s: Service) => s.id === serviceId,
    );
    const selectedStaff = staffId
      ? ctx.scene.session.staff?.find((s: Staff) => s.id === staffId)
      : null;

    const date = new Date(datetime);
    const dateStr = date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let message = "✅ <b>Подтвердите запись:</b>\n\n";
    message += `💇 <b>Услуга:</b> ${selectedService?.title}\n`;
    message += `👨‍💼 <b>Мастер:</b> ${selectedStaff ? selectedStaff.name : "Любой свободный"}\n`;
    message += `📅 <b>Дата:</b> ${dateStr}\n`;
    message += `⏰ <b>Время:</b> ${timeStr}\n`;

    if (selectedService) {
      const priceRange =
        selectedService.price_min === selectedService.price_max
          ? `${selectedService.price_min} ₽`
          : `${selectedService.price_min}-${selectedService.price_max} ₽`;
      message += `💰 <b>Стоимость:</b> ${priceRange}\n`;
    }

    const buttons = [
      [
        Markup.button.callback("✅ Подтвердить", "confirm"),
        Markup.button.callback("❌ Отмена", "cancel"),
      ],
    ];

    // Проверяем, есть ли callbackQuery (редактируем сообщение) или нет (отправляем новое)
    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
      });
    } else {
      await ctx.reply(message, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
      });
    }
  }

  @Action("confirm")
  async onConfirm(@Ctx() ctx: MyContext): Promise<void> {
    if (!ctx.callbackQuery) return;

    try {
      const { serviceId, staffId, datetime } = ctx.scene.session.booking;

      if (!serviceId || !datetime) {
        await ctx.answerCbQuery("Ошибка: не все данные заполнены");
        return;
      }

      // Создаем запись
      const record = await this.bookingService.createBooking(
        serviceId,
        staffId,
        datetime,
        ctx.user,
      );

      await ctx.answerCbQuery("✅ Запись создана!");

      const date = new Date(datetime);
      const dateStr = date.toLocaleDateString("ru-RU");
      const timeStr = date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const selectedService = ctx.scene.session.services?.find(
        (s: Service) => s.id === serviceId,
      );

      await ctx.reply(
        `✅ <b>Запись успешно создана!</b>\n\n📅 ${dateStr} в ${timeStr}\n💇 ${selectedService?.title || "Услуга"}\n\nЖдём вас! 😊`,
        { parse_mode: "HTML", ...mainMenuKeyboard() },
      );

      await ctx.scene.leave();
    } catch (error) {
      this.logger.error("Failed to create booking", error);
      await ctx.answerCbQuery("Ошибка при создании записи");
      await ctx.reply(
        "Произошла ошибка при создании записи. Попробуйте позже.",
        mainMenuKeyboard(),
      );
      await ctx.scene.leave();
    }
  }

  @Action("cancel")
  async onCancel(@Ctx() ctx: MyContext): Promise<void> {
    await ctx.answerCbQuery("Запись отменена");
    await ctx.reply("❌ Запись отменена", mainMenuKeyboard());
    await ctx.scene.leave();
  }

  @Action("back_to_services")
  async onBackToServices(@Ctx() ctx: MyContext): Promise<void> {
    await ctx.answerCbQuery();
    await this.showServices(ctx);
  }

  @Action("back_to_staff")
  async onBackToStaff(@Ctx() ctx: MyContext): Promise<void> {
    await ctx.answerCbQuery();
    const { serviceId } = ctx.scene.session.booking;
    if (serviceId) {
      await this.showStaff(ctx, serviceId);
    }
  }

  @Action("back_to_dates")
  async onBackToDates(@Ctx() ctx: MyContext): Promise<void> {
    await ctx.answerCbQuery();
    await this.showDates(ctx);
  }

  // Вспомогательные методы для кнопок меню
  private async showServicesInfo(@Ctx() ctx: MyContext): Promise<void> {
    try {
      const services = await this.bookingService.getAvailableServices();

      if (services.length === 0) {
        await ctx.reply(
          "К сожалению, пока нет доступных услуг.",
          mainMenuKeyboard(),
        );
        return;
      }

      let message = "💇 <b>Наши услуги:</b>\n\n";
      for (const service of services) {
        const duration = Math.round(service.duration / 60);
        const priceRange =
          service.price_min === service.price_max
            ? `${service.price_min} ₽`
            : `${service.price_min}-${service.price_max} ₽`;

        message += `<b>${service.title}</b>\n`;
        message += `💰 ${priceRange}\n`;
        message += `⏱ ${duration} мин\n\n`;
      }

      await ctx.reply(message, { parse_mode: "HTML", ...mainMenuKeyboard() });
    } catch (error) {
      this.logger.error("Failed to fetch services", error);
      await ctx.reply(
        "Произошла ошибка при загрузке услуг. Попробуйте позже.",
        mainMenuKeyboard(),
      );
    }
  }

  private async showMyBookings(@Ctx() ctx: MyContext): Promise<void> {
    try {
      const records = await this.bookingService.getUserBookings(ctx.user.id);

      if (records.length === 0) {
        await ctx.reply("У вас пока нет активных записей.", mainMenuKeyboard());
        return;
      }

      let message = "📋 <b>Ваши записи:</b>\n\n";
      for (const record of records) {
        const date = new Date(record.datetime);
        const dateStr = date.toLocaleDateString("ru-RU");
        const timeStr = date.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        });

        message += `<b>${record.services.map((s) => s.title).join(", ")}</b>\n`;
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
        message += "\n";
      }

      await ctx.reply(message, { parse_mode: "HTML", ...mainMenuKeyboard() });
    } catch (error) {
      this.logger.error("Failed to fetch user bookings", error);
      await ctx.reply(
        "Произошла ошибка при загрузке записей. Попробуйте позже.",
        mainMenuKeyboard(),
      );
    }
  }

  private async showHelp(@Ctx() ctx: MyContext): Promise<void> {
    await ctx.reply(
      "ℹ️ <b>Помощь по боту</b>\n\n" +
        "<b>Доступные команды:</b>\n" +
        "/services - посмотреть услуги и цены\n" +
        "/book - записаться на стрижку\n" +
        "/my_bookings - посмотреть свои записи\n" +
        "/help - эта справка\n\n" +
        "Также можно использовать кнопки в меню.",
      { parse_mode: "HTML", ...mainMenuKeyboard() },
    );
  }
}
