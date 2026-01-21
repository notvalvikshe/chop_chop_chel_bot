# 🔍 Мониторинг и управление ботом

## Быстрый доступ к VPS

```bash
# Подключение к серверу
ssh -i ~/.ssh/chopbot_deploy_key root@78.153.139.53

# Переход в директорию проекта
cd /home/user/chopbot
```

Или одной командой с локального Mac:

```bash
ssh -i ~/.ssh/chopbot_deploy_key root@78.153.139.53 "cd /home/user/chopbot && <команда>"
```

---

## 📊 Мониторинг состояния

### Статус контейнеров

```bash
docker-compose -f docker-compose.prod.yml ps
```

**Должно быть:**

- `chopbot_postgres` - `Up` (healthy)
- `chopbot_app` - `Up`

### Логи бота (в реальном времени)

```bash
docker-compose -f docker-compose.prod.yml logs -f bot
```

Выход: `Ctrl+C`

### Последние 50 строк логов

```bash
docker-compose -f docker-compose.prod.yml logs --tail=50 bot
```

### Логи базы данных

```bash
docker-compose -f docker-compose.prod.yml logs --tail=50 postgres
```

### Использование ресурсов

```bash
# Все контейнеры
docker stats

# Использование диска
df -h

# Свободная память
free -h

# Загрузка процессора
top
```

---

## 🔄 Управление ботом

### Перезапуск бота

```bash
docker-compose -f docker-compose.prod.yml restart bot
```

### Полный перезапуск (бот + БД)

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Остановка

```bash
docker-compose -f docker-compose.prod.yml stop
```

### Запуск

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Остановка и удаление контейнеров (БД сохраняется!)

```bash
docker-compose -f docker-compose.prod.yml down
```

### Пересборка и перезапуск

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 💾 Бэкап базы данных

### Ручной бэкап

#### С локального Mac:

```bash
# Создать бэкап
ssh -i ~/.ssh/chopbot_deploy_key root@78.153.139.53 \
  "docker exec chopbot_postgres pg_dump -U postgres chopbot" > backup_$(date +%Y%m%d_%H%M%S).sql

# Скачать бэкап
scp -i ~/.ssh/chopbot_deploy_key \
  root@78.153.139.53:/root/backup_*.sql \
  ~/Desktop/chopbot_backups/
```

#### На VPS:

```bash
# Создать бэкап
docker exec chopbot_postgres pg_dump -U postgres chopbot > backup_$(date +%Y%m%d_%H%M%S).sql

# Посмотреть список бэкапов
ls -lh backup_*.sql
```

### Восстановление из бэкапа

```bash
# Восстановить базу
docker exec -i chopbot_postgres psql -U postgres chopbot < backup_20260121_123456.sql
```

### Автоматический бэкап через cron

Создайте скрипт бэкапа:

```bash
# На VPS
cat > /root/backup_chopbot.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="chopbot_backup_$DATE.sql"

mkdir -p $BACKUP_DIR
cd /home/user/chopbot
docker exec chopbot_postgres pg_dump -U postgres chopbot > "$BACKUP_DIR/$FILENAME"

# Удалить бэкапы старше 7 дней
find $BACKUP_DIR -name "chopbot_backup_*.sql" -mtime +7 -delete

# Оставить только последние 10 бэкапов
ls -t $BACKUP_DIR/chopbot_backup_*.sql | tail -n +11 | xargs rm -f

echo "Backup created: $FILENAME"
EOF

chmod +x /root/backup_chopbot.sh
```

Добавьте в cron (бэкап каждый день в 3 ночи):

```bash
crontab -e
```

Добавьте строку:

```
0 3 * * * /root/backup_chopbot.sh >> /var/log/chopbot_backup.log 2>&1
```

Проверка cron:

```bash
crontab -l
```

---

## 🗄️ Работа с базой данных

### Подключение к PostgreSQL

```bash
docker exec -it chopbot_postgres psql -U postgres -d chopbot
```

**Внутри psql:**

```sql
-- Список таблиц
\dt

-- Структура таблицы users
\d users

-- Количество пользователей
SELECT COUNT(*) FROM users;

-- Последние 10 пользователей
SELECT id, telegram_id, first_name, yclients_phone, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Выход
\q
```

### Полезные SQL запросы

```sql
-- Все пользователи с контактами
SELECT telegram_id, first_name, yclients_phone, yclients_email
FROM users
WHERE yclients_phone IS NOT NULL;

-- Очистить телефон и email конкретного пользователя
UPDATE users
SET yclients_phone = NULL, yclients_email = NULL
WHERE telegram_id = 123456789;

-- Добавить пользователя в whitelist
UPDATE users
SET in_whitelist = true
WHERE telegram_id = 123456789;
```

---

## 📈 Мониторинг через логи

### Просмотр ошибок

```bash
docker-compose -f docker-compose.prod.yml logs bot | grep ERROR
```

### Просмотр запросов к YClients API

```bash
docker-compose -f docker-compose.prod.yml logs bot | grep "YClientsApiService"
```

### Просмотр действий пользователей

```bash
docker-compose -f docker-compose.prod.yml logs bot | grep "MessageLogger"
```

### Сохранить логи в файл

```bash
docker-compose -f docker-compose.prod.yml logs --since 24h bot > bot_logs_$(date +%Y%m%d).txt
```

---

## 🚨 Troubleshooting

### Бот не отвечает

1. **Проверить статус:**

   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Посмотреть логи:**

   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=50 bot
   ```

3. **Перезапустить:**
   ```bash
   docker-compose -f docker-compose.prod.yml restart bot
   ```

### База данных не подключается

1. **Проверить статус PostgreSQL:**

   ```bash
   docker-compose -f docker-compose.prod.yml logs postgres
   ```

2. **Проверить healthcheck:**

   ```bash
   docker inspect chopbot_postgres | grep -A 5 Health
   ```

3. **Перезапустить всё:**
   ```bash
   docker-compose -f docker-compose.prod.yml restart
   ```

### Контейнер постоянно перезапускается

```bash
# Посмотреть причину
docker-compose -f docker-compose.prod.yml logs bot

# Проверить переменные окружения
docker exec chopbot_app env | grep TELEGRAM

# Проверить .env файл
cat /home/user/chopbot/.env
```

### Закончилось место на диске

```bash
# Очистить старые образы
docker image prune -a -f

# Очистить неиспользуемые контейнеры
docker container prune -f

# Очистить все неиспользуемое
docker system prune -a -f

# Удалить логи Docker (если очень много)
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

---

## 📊 Алерты и уведомления

### Простой мониторинг через Telegram

Создайте скрипт проверки:

```bash
cat > /root/check_chopbot.sh << 'EOF'
#!/bin/bash
STATUS=$(docker inspect -f '{{.State.Running}}' chopbot_app 2>/dev/null)

if [ "$STATUS" != "true" ]; then
    # Бот не работает - отправить уведомление
    curl -s -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
        -d chat_id=<YOUR_CHAT_ID> \
        -d text="⚠️ ChopBot остановлен! Требуется внимание."
fi
EOF

chmod +x /root/check_chopbot.sh
```

Добавьте в cron (проверка каждые 5 минут):

```bash
*/5 * * * * /root/check_chopbot.sh
```

---

## 🔐 Безопасность

### Просмотр активных подключений

```bash
# SSH сессии
who

# Последние входы
last -10

# История команд
history | tail -20
```

### Обновление системы

```bash
apt update && apt upgrade -y
```

### Проверка Docker версии

```bash
docker --version
docker-compose --version
```

---

## 📱 Быстрые команды с Mac

Добавьте алиасы в `~/.zshrc`:

```bash
# Добавить в ~/.zshrc
alias chopbot-ssh='ssh -i ~/.ssh/chopbot_deploy_key root@78.153.139.53'
alias chopbot-logs='ssh -i ~/.ssh/chopbot_deploy_key root@78.153.139.53 "cd /home/user/chopbot && docker-compose -f docker-compose.prod.yml logs -f bot"'
alias chopbot-status='ssh -i ~/.ssh/chopbot_deploy_key root@78.153.139.53 "cd /home/user/chopbot && docker-compose -f docker-compose.prod.yml ps"'
alias chopbot-restart='ssh -i ~/.ssh/chopbot_deploy_key root@78.153.139.53 "cd /home/user/chopbot && docker-compose -f docker-compose.prod.yml restart bot"'
alias chopbot-backup='ssh -i ~/.ssh/chopbot_deploy_key root@78.153.139.53 "docker exec chopbot_postgres pg_dump -U postgres chopbot" > ~/Desktop/chopbot_backup_$(date +%Y%m%d_%H%M%S).sql'
```

После добавления:

```bash
source ~/.zshrc
```

Теперь можно использовать:

```bash
chopbot-logs      # Просмотр логов
chopbot-status    # Статус
chopbot-restart   # Перезапуск
chopbot-backup    # Создать бэкап
```

---

## 📞 Контакты для поддержки

- **GitHub Actions**: https://github.com/notvalvikshe/chop_chop_chel_bot/actions
- **Логи деплоя**: Проверяйте в Actions после каждого push

**Важные файлы на VPS:**

- `.env` - `/home/user/chopbot/.env`
- Логи бота - `docker-compose logs bot`
- База данных - внутри контейнера `chopbot_postgres`
