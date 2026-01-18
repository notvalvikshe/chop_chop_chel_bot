import { InlineKeyboardMarkup, ReplyKeyboardMarkup } from 'typegram';

/**
 * Базовый абстрактный класс для всех клавиатур
 */
export abstract class BaseKeyboard {
	/**
	 * Возвращает клавиатуру для отображения
	 */
	abstract getKeyboard(): ReplyKeyboardMarkup | InlineKeyboardMarkup;
}
