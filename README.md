# Telegram Bot Template

Шаблон Telegram-бота на NestJS + Telegraf + Drizzle ORM + PostgreSQL.

## Стек

- **NestJS** — фреймворк
- **Telegraf** — Telegram Bot API
- **Drizzle ORM** — работа с БД
- **PostgreSQL** — база данных
- **Zod** — валидация

## Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Настройка окружения

Создай `.env` файл:

```env
ENV=development
PORT=3000

DATABASE_URL=postgresql://admin:admin@localhost:5432/tg-bot
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=admin
DB_NAME=tg-bot

TELEGRAM_TOKEN=your_bot_token_here
```

### 3. Запуск PostgreSQL

```bash
docker-compose up -d
```

### 4. Миграция БД

```bash
pnpm db:push
```

### 5. Запуск бота

```bash
pnpm start:dev
```

## Структура проекта

```
src/
├── app/
│   ├── bot/           # Telegram бот
│   └── user/          # Модуль пользователей
├── db/                # База данных (Drizzle)
├── middleware/        # Middleware
├── app.module.ts      # Главный модуль
├── env.validator.ts   # Валидация ENV
└── main.ts            # Точка входа
```

## Команды

| Команда | Описание |
|---------|----------|
| `pnpm start:dev` | Запуск в dev режиме |
| `pnpm build` | Сборка проекта |
| `pnpm db:push` | Применить схему к БД |
| `pnpm db:generate` | Сгенерировать миграцию |
