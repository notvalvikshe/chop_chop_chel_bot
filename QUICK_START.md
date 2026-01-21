# Быстрый старт деплоя

## Шаг 1: Настройка VPS

Подключитесь к вашему VPS и выполните:

```bash
# Установка Docker и Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install docker-compose-plugin git -y

# Перезайдите в систему для применения прав Docker
exit
```

## Шаг 2: Клонирование репозитория

```bash
# Создайте SSH ключ для GitHub
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub  # Добавьте в GitHub Settings → SSH Keys

# Клонируйте репозиторий
cd ~
git clone git@github.com:YOUR_USERNAME/chop_chop_chel_bot.git
cd chop_chop_chel_bot
```

## Шаг 3: Настройка .env

```bash
# Скопируйте и отредактируйте .env
nano .env
```

Вставьте ваши данные (можно скопировать из локального .env, но смените ENV на production):

```env
ENV=production
PORT=3000

DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=ваш_безопасный_пароль_измените_это
DB_NAME=chopbot
DATABASE_URL=postgresql://postgres:ваш_безопасный_пароль_измените_это@postgres:5432/chopbot

TELEGRAM_TOKEN=ваш_токен_бота

YCLIENTS_PARTNER_TOKEN=ваш_partner_token
YCLIENTS_USER_TOKEN=ваш_user_token
YCLIENTS_PARTNER_ID=ваш_partner_id
YCLIENTS_COMPANY_ID=ваш_company_id
```

**ВАЖНО:** Измените `DB_PASSWORD` на безопасный пароль!

## Шаг 4: Запуск

```bash
# Запуск в продакшн режиме
docker compose -f docker-compose.prod.yml up -d --build

# Проверка логов
docker compose -f docker-compose.prod.yml logs -f
```

## Шаг 5: Настройка GitHub Actions для автодеплоя

### На локальном компьютере:

```bash
# Создайте SSH ключ для GitHub Actions
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key -N ""

# Скопируйте публичный ключ
cat ~/.ssh/github_actions_key.pub
```

### На VPS:

```bash
# Добавьте публичный ключ
echo "ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ_СЮДА" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### В GitHub (Settings → Secrets → Actions):

Добавьте следующие секреты:

- **VPS_HOST**: IP вашего VPS (например: `123.45.67.89`)
- **VPS_USER**: пользователь SSH (например: `root` или `ubuntu`)
- **VPS_PORT**: `22` (или ваш SSH порт)
- **VPS_SSH_KEY**: приватный ключ (содержимое `~/.ssh/github_actions_key` на локальном ПК)
- **VPS_PROJECT_PATH**: `/root/chop_chop_chel_bot` (или путь где находится проект на VPS)

### Получение приватного ключа:

```bash
# На локальном компьютере
cat ~/.ssh/github_actions_key
```

Скопируйте весь вывод включая строки `-----BEGIN` и `-----END`.

## Готово!

Теперь при каждом push в main/master ветку, бот будет автоматически обновляться на VPS.

## Полезные команды

```bash
# Просмотр логов
docker compose -f docker-compose.prod.yml logs -f bot

# Перезапуск бота
docker compose -f docker-compose.prod.yml restart bot

# Остановка всех сервисов
docker compose -f docker-compose.prod.yml down

# Обновление вручную
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

Полная документация в [DEPLOY.md](./DEPLOY.md)
