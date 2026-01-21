import { cluster } from 'radash';
import { Markup } from 'telegraf';
import { InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup } from 'typegram';

const SPECIAL_CHARS = ['\\', '_', '*', '[', ']', '(', ')', '~', '`', '>', '<', '&', '#', '+', '-', '=', '|', '{', '}', '.', '!'];

export const escapeMarkdown = (text: string) => {
	let result = text;
	for (const char of SPECIAL_CHARS) {
		result = result.replaceAll(char, `\\${char}`);
	}
	return result;
};

type ButtonLayoutOptions<T> = {
	maxPerRow?: number;
	extraButtons?: T[][];
};

export const createKeyboard = (buttons: string[], options: ButtonLayoutOptions<string>): Markup.Markup<ReplyKeyboardMarkup> => {
	const { maxPerRow = 4, extraButtons = [] } = options;

	if (!buttons || (buttons.length === 0 && extraButtons.length === 0)) {
		return Markup.keyboard([]);
	}

	const mainButtonRows: string[][] = cluster(buttons, maxPerRow);

	const keyboard: string[][] = [...mainButtonRows, ...extraButtons];

	return Markup.keyboard(keyboard);
};

export const createInlineKeyboard = (
	buttons: InlineKeyboardButton[],
	options: ButtonLayoutOptions<InlineKeyboardButton>,
): Markup.Markup<InlineKeyboardMarkup> => {
	const { maxPerRow = 3, extraButtons = [] } = options;

	if (!buttons || (buttons.length === 0 && extraButtons.length === 0)) {
		return Markup.inlineKeyboard([]);
	}

	const mainButtonRows: InlineKeyboardButton[][] = cluster(buttons, maxPerRow);
	const keyboard: InlineKeyboardButton[][] = [...mainButtonRows, ...extraButtons];

	return Markup.inlineKeyboard(keyboard);
};
