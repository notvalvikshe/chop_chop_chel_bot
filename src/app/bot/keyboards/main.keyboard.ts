import { Markup, type Markup as MarkupType } from "telegraf";

export interface MainMenuOptions {
  showAdminButton?: boolean;
}

export const mainMenuKeyboard = (
  options: MainMenuOptions = {},
): ReturnType<typeof Markup.keyboard> => {
  const rows = [
    [{ text: "📋 Мои записи" }, { text: "📅 Записаться" }],
    [{ text: "💇 Услуги и цены" }, { text: "ℹ️ Помощь" }],
  ];

  if (options.showAdminButton) {
    rows.push([{ text: "📞 Позвать админа" }]);
  }

  return Markup.keyboard(rows).resize();
};

export const cancelKeyboard = (): ReturnType<typeof Markup.keyboard> =>
  Markup.keyboard([["❌ Отмена"]])
    .resize()
    .oneTime();

export const removeKeyboard = (): ReturnType<typeof Markup.removeKeyboard> =>
  Markup.removeKeyboard();
