# Инструкция по деплою на VPS

## Подготовка VPS

### 1. Установка необходимого ПО

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt install docker-compose-plugin -y

# Установка Git
sudo apt install git -y
```

### 2. Создание SSH ключа для GitHub

```bash
# Генерация SSH ключа
ssh-keygen -t ed25519 -C "your_email@example.com"

# Просмотр публичного ключа
cat ~/.ssh/id_ed25519.pub
```

Добавьте публичный ключ в GitHub: Settings → SSH and GPG keys → New SSH key

### 3. Клонирование репозитория

```bash
# Создание директории для проекта
mkdir -p ~/projects
cd ~/projects

# Клонирование репозитория
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 4. Настройка переменных окружения

```bash
# Создание .env файла
cp .env.example .env
nano .env
```

Заполните все переменные окружения:
- `DB_PASSWORD` - безопасный пароль для PostgreSQL
- `TELEGRAM_TOKEN` - токен вашего Telegram бота
- `YCLIENTS_*` - токены и ID для YClients API

### 5. Первый запуск

```bash
# Сборка и запуск контейнеров
docker compose -f docker-compose.prod.yml up -d --build

# Просмотр логов
docker compose -f docker-compose.prod.yml logs -f

# Проверка статуса
docker compose -f docker-compose.prod.yml ps
```

## Настройка GitHub Actions

### 1. Генерация SSH ключа для деплоя

На вашем локальном компьютере:

```bash
# Генерация SSH ключа без пароля
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key -N ""

# Просмотр приватного ключа
cat ~/.ssh/github_actions_key

# Просмотр публичного ключа
cat ~/.ssh/github_actions_key.pub
```

### 2. Добавление публичного ключа на VPS

На VPS сервере:

```bash
# Добавление публичного ключа в authorized_keys
echo "ВАШИ_ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Настройка Secrets в GitHub

Перейдите в репозиторий: Settings → Secrets and variables → Actions → New repository secret

Добавьте следующие secrets:

- `VPS_HOST` - IP адрес или домен вашего VPS (например: 192.168.1.100)
- `VPS_USER` - пользователь для подключения (например: ubuntu или root)
- `VPS_PORT` - порт SSH (обычно 22)
- `VPS_SSH_KEY` - приватный ключ (содержимое файла ~/.ssh/github_actions_key)
- `VPS_PROJECT_PATH` - путь к проекту на VPS (например: /home/ubuntu/projects/chopbot)

### 4. Проверка деплоя

После настройки secrets, при каждом пуше в main/master ветку будет автоматически запускаться деплой.

Проверить статус деплоя можно в разделе Actions вашего репозитория.

## Полезные команды

### Просмотр логов

```bash
# Все логи
docker compose -f docker-compose.prod.yml logs -f

# Логи только бота
docker compose -f docker-compose.prod.yml logs -f bot

# Логи PostgreSQL
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Перезапуск

```bash
# Перезапуск всех сервисов
docker compose -f docker-compose.prod.yml restart

# Перезапуск только бота
docker compose -f docker-compose.prod.yml restart bot
```

### Остановка и удаление

```bash
# Остановка
docker compose -f docker-compose.prod.yml stop

# Удаление контейнеров (данные в volumes сохранятся)
docker compose -f docker-compose.prod.yml down

# Удаление контейнеров и volumes (ОСТОРОЖНО: удалит базу данных!)
docker compose -f docker-compose.prod.yml down -v
```

### Обновление вручную

```bash
cd ~/projects/YOUR_REPO
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Подключение к базе данных

```bash
# Через Docker
docker exec -it chopbot_postgres psql -U postgres -d chopbot

# Или напрямую (если PostgreSQL открыт наружу)
psql postgresql://postgres:PASSWORD@localhost:5432/chopbot
```

### Бэкап базы данных

```bash
# Создание бэкапа
docker exec chopbot_postgres pg_dump -U postgres chopbot > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker exec -i chopbot_postgres psql -U postgres chopbot < backup_20260121_123456.sql
```

## Безопасность

### Рекомендуемые настройки

1. **Изменить SSH порт** (необязательно, но рекомендуется):
```bash
sudo nano /etc/ssh/sshd_config
# Изменить Port 22 на другой (например, Port 2222)
sudo systemctl restart sshd
```

2. **Настроить Firewall**:
```bash
sudo ufw allow 2222/tcp  # SSH (если изменили порт)
sudo ufw enable
```

3. **Отключить вход по паролю** (только SSH ключи):
```bash
sudo nano /etc/ssh/sshd_config
# Установить: PasswordAuthentication no
sudo systemctl restart sshd
```

4. **Регулярные обновления**:
```bash
sudo apt update && sudo apt upgrade -y
```

## Мониторинг

### Системные ресурсы

```bash
# Использование Docker
docker stats

# Использование диска
df -h

# Использование памяти
free -h
```

### Автоматический перезапуск при сбое

Docker Compose уже настроен с `restart: unless-stopped`, поэтому контейнеры будут автоматически перезапускаться при сбоях.

## Troubleshooting

### Бот не отвечает

1. Проверьте логи: `docker compose -f docker-compose.prod.yml logs -f bot`
2. Проверьте статус: `docker compose -f docker-compose.prod.yml ps`
3. Перезапустите: `docker compose -f docker-compose.prod.yml restart bot`

### База данных не подключается

1. Проверьте логи PostgreSQL: `docker compose -f docker-compose.prod.yml logs -f postgres`
2. Проверьте переменные окружения в .env файле
3. Проверьте healthcheck: `docker inspect chopbot_postgres`

### GitHub Actions не работает

1. Проверьте все secrets в настройках репозитория
2. Проверьте формат приватного ключа (должен начинаться с `-----BEGIN OPENSSH PRIVATE KEY-----`)
3. Проверьте, что публичный ключ добавлен на VPS в `~/.ssh/authorized_keys`
4. Попробуйте подключиться вручную: `ssh -i ~/.ssh/github_actions_key user@host`
