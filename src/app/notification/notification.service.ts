import { Injectable, Logger } from "@nestjs/common";
import { InjectBot } from "nestjs-telegraf";
import { Telegraf } from "telegraf";
import { MyContext } from "../bot/helpers/bot-types";
import { UserRepository } from "../user/user.repository";

export interface SendMessageOptions {
  /** Массив внутренних ID пользователей */
  userIds: number[];
  /** Текст сообщения (поддерживает Markdown) */
  message: string;
  /** Дата и время отложенной отправки (если не указано — отправляется сразу) */
  scheduledAt?: Date;
  /** Режим парсинга: Markdown, MarkdownV2, HTML */
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
}

export interface SendMessageResult {
  /** Количество успешно отправленных сообщений */
  sent: number;
  /** Количество неудачных отправок */
  failed: number;
  /** Детали ошибок по пользователям */
  errors: Array<{ userId: number; telegramId: number; error: string }>;
}

export interface ScheduledMessage {
  id: string;
  userIds: number[];
  message: string;
  scheduledAt: Date;
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  status: "pending" | "sent" | "cancelled";
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private scheduledMessages: Map<
    string,
    { message: ScheduledMessage; timeoutId: NodeJS.Timeout }
  > = new Map();

  constructor(
    @InjectBot() private bot: Telegraf<MyContext>,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Отправить сообщение пользователям
   * Если указана scheduledAt — сообщение будет отправлено в указанное время
   */
  async sendMessage(
    options: SendMessageOptions,
  ): Promise<SendMessageResult | ScheduledMessage> {
    const { userIds, message, scheduledAt, parseMode } = options;

    // Если указано время отправки — планируем отложенную отправку
    if (scheduledAt) {
      return this.scheduleMessage(userIds, message, scheduledAt, parseMode);
    }

    // Иначе отправляем сразу
    return this.sendImmediate(userIds, message, parseMode);
  }

  /**
   * Отправить сообщение немедленно
   */
  async sendImmediate(
    userIds: number[],
    message: string,
    parseMode?: "Markdown" | "MarkdownV2" | "HTML",
  ): Promise<SendMessageResult> {
    const result: SendMessageResult = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    // Получаем пользователей из БД
    const users = await this.userRepository.findByIds(userIds);

    if (users.length === 0) {
      this.logger.warn(`No users found for IDs: ${userIds.join(", ")}`);
      return result;
    }

    // Отправляем сообщения параллельно, но с ограничением (Telegram rate limit)
    const batchSize = 25; // Telegram позволяет ~30 сообщений в секунду
    const delay = 50; // мс между сообщениями

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          try {
            await this.bot.telegram.sendMessage(user.telegramId, message, {
              parse_mode: parseMode,
            });
            result.sent++;
            this.logger.debug(
              `Message sent to user ${user.id} (telegram: ${user.telegramId})`,
            );
          } catch (error) {
            result.failed++;
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            result.errors.push({
              userId: user.id,
              telegramId: user.telegramId,
              error: errorMessage,
            });
            this.logger.error(
              `Failed to send message to user ${user.id}: ${errorMessage}`,
            );
          }
        }),
      );

      // Пауза между батчами для соблюдения rate limit
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, delay * batchSize));
      }
    }

    this.logger.log(
      `Broadcast complete: ${result.sent} sent, ${result.failed} failed`,
    );
    return result;
  }

  /**
   * Запланировать отложенную отправку сообщения
   */
  scheduleMessage(
    userIds: number[],
    message: string,
    scheduledAt: Date,
    parseMode?: "Markdown" | "MarkdownV2" | "HTML",
  ): ScheduledMessage {
    const id = this.generateId();
    const now = new Date();
    const delayMs = scheduledAt.getTime() - now.getTime();

    if (delayMs <= 0) {
      throw new Error("Scheduled time must be in the future");
    }

    const scheduledMessage: ScheduledMessage = {
      id,
      userIds,
      message,
      scheduledAt,
      parseMode,
      status: "pending",
      createdAt: now,
    };

    const timeoutId = setTimeout(async () => {
      this.logger.log(`Executing scheduled message ${id}`);
      await this.sendImmediate(userIds, message, parseMode);
      scheduledMessage.status = "sent";
      this.scheduledMessages.delete(id);
    }, delayMs);

    this.scheduledMessages.set(id, { message: scheduledMessage, timeoutId });
    this.logger.log(
      `Message scheduled: ${id}, will be sent at ${scheduledAt.toISOString()}`,
    );

    return scheduledMessage;
  }

  /**
   * Отменить запланированное сообщение
   */
  cancelScheduledMessage(id: string): boolean {
    const scheduled = this.scheduledMessages.get(id);
    if (!scheduled) {
      return false;
    }

    clearTimeout(scheduled.timeoutId);
    scheduled.message.status = "cancelled";
    this.scheduledMessages.delete(id);
    this.logger.log(`Scheduled message cancelled: ${id}`);
    return true;
  }

  /**
   * Получить список запланированных сообщений
   */
  getScheduledMessages(): ScheduledMessage[] {
    return Array.from(this.scheduledMessages.values()).map((s) => s.message);
  }

  /**
   * Получить запланированное сообщение по ID
   */
  getScheduledMessage(id: string): ScheduledMessage | null {
    return this.scheduledMessages.get(id)?.message || null;
  }

  /**
   * Отправить сообщение всем пользователям
   */
  async broadcastToAll(
    message: string,
    parseMode?: "Markdown" | "MarkdownV2" | "HTML",
    scheduledAt?: Date,
  ): Promise<SendMessageResult | ScheduledMessage> {
    const allUsers = await this.userRepository.findAll();
    const userIds = allUsers.map((u) => u.id);

    return this.sendMessage({ userIds, message, parseMode, scheduledAt });
  }

  /**
   * Отправить сообщение пользователям в whitelist
   */
  async broadcastToWhitelist(
    message: string,
    parseMode?: "Markdown" | "MarkdownV2" | "HTML",
    scheduledAt?: Date,
  ): Promise<SendMessageResult | ScheduledMessage> {
    const { users } = await this.userRepository.findWithFilters({
      inWhitelist: true,
    });
    const userIds = users.map((u) => u.id);

    return this.sendMessage({ userIds, message, parseMode, scheduledAt });
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
