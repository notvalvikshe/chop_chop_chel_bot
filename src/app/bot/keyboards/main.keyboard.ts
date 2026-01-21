import { Markup, type Markup as MarkupType } from 'telegraf';

export const mainMenuKeyboard = (): ReturnType<typeof Markup.keyboard> =>
	Markup.keyboard([
		[{ text: '📋 Мои записи' }, { text: '📅 Записаться' }],
		[{ text: '💇 Услуги и цены' }, { text: 'ℹ️ Помощь' }],
	]).resize();

export const cancelKeyboard = (): ReturnType<typeof Markup.keyboard> =>
	Markup.keyboard([['❌ Отмена']])
		.resize()
		.oneTime();

export const removeKeyboard = (): ReturnType<typeof Markup.removeKeyboard> => Markup.removeKeyboard();
