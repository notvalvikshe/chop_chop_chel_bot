import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Env } from "../../env.validator";
import { SettingsRepository } from "./settings.repository";

export const SETTINGS_KEYS = {
  ADMIN_CHAT_LINK: "admin_chat_link",
} as const;

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Получить ссылку на чат с админом (из БД или дефолтную из env)
   */
  async getAdminChatLink(): Promise<string | null> {
    const dbValue = await this.settingsRepository.get(
      SETTINGS_KEYS.ADMIN_CHAT_LINK,
    );
    if (dbValue) {
      return dbValue;
    }
    // Возвращаем дефолтное значение из env
    return this.config.get("DEFAULT_ADMIN") || null;
  }

  /**
   * Установить ссылку на чат с админом
   */
  async setAdminChatLink(link: string): Promise<void> {
    await this.settingsRepository.set(SETTINGS_KEYS.ADMIN_CHAT_LINK, link);
  }

  /**
   * Удалить ссылку на чат с админом
   */
  async removeAdminChatLink(): Promise<void> {
    await this.settingsRepository.delete(SETTINGS_KEYS.ADMIN_CHAT_LINK);
  }
}
