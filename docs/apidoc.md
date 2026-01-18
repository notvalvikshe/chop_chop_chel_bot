# YCLIENTS Telegram Booking Bot – LLM API Spec (TypeScript, Self‑Contained)

This document is a self‑contained contract for a TypeScript Telegram bot using YCLIENTS REST API for online booking.[page:1]

---

## 1. High‑level role of the LLM

_(RU: общий контекст задачи)_

You generate and maintain TypeScript code for a Telegram bot that lets users book and manage appointments via YCLIENTS.[page:1]  
The bot must:

- Let users choose company/branch, services, staff, date and time.
- Create, list and cancel/reschedule bookings for the authenticated phone number (when allowed by rules).[page:1]
- Use only endpoints and formats defined in this document.

---

## 2. Global YCLIENTS API rules

_(RU: базовые правила API)_

- Base URL: `https://api.yclients.com`.[page:1]
- All requests: HTTPS, JSON.
- Rate limits: 200 requests/minute per IP.[page:1]
- Version header (required):
  - `Accept: application/vnd.yclients.v2+json`.[page:1]
- Authorization header:
  - Partner only:
    - `Authorization: Bearer <partner_token>`.[page:1]
  - Partner + user:
    - `Authorization: Bearer <partner_token>, User <user_token>`.[page:1]
- Date/time format: ISO 8601, e.g. `"2014-09-21T23:00:00.000+03:00"`.[page:1]
- Durations (`length`): in seconds (30 minutes → `1800`).[page:1]
- Standard response envelope:
  ````json
  {
    "success": true,
    "data": { ... },
    "meta": { ... }
  }
  ```[page:1]
  ````

The LLM **must not invent new endpoints or fields outside this spec**.

---

## 3. Core entities

_(RU: модель данных)_

Entities used in the bot:[page:1]

- **Company**: branch providing services (`id`, `title`, `address`, `phone`).
- **ServiceCategory**: group of services for a company (`id`, `title`).
- **Service**: concrete service (`id`, `title`, `length`, `price_min`, `price_max`, `allow_online`).[page:1]
- **Staff**: employee (`id`, `name`, `specialization`, `online_booking_enabled`).
- **FreeTimeSlot**: date/time slot available for booking.
- **Client**: user booking services (`id`, `name`, `phone`, `email`).
- **Record (Booking/Visit)**: appointment (`id`, `company_id`, `staff_id`, `services`, `datetime`, `client`).[page:1]

---

## 4. Endpoints (canonical list)

_(RU: все используемые ручки)_

### 4.1 Authorization & SMS login

#### 4.1.1 Start auth (send SMS / 2FA start)

- **POST `/api/v1/auth`**.[page:1]
- **Headers**:
  - `Accept: application/vnd.yclients.v2+json`
  - `Content-Type: application/json`
  - `Authorization: Bearer <partner_token>`.[page:1]
- **Body** (start flow, using phone as login):
  ````json
  {
    "login": "+79001234567"
  }
  ```[page:1]
  ````
- **Response (2FA / SMS required)** – HTTP 200:
  ````json
  {
    "success": true,
    "data": {
      "flow": "login",
      "uuid": "a1b2c3d4e5",
      "message": "Code sent via SMS"
    },
    "meta": {}
  }
  ```[page:1]
  ````

> RU: дергается, когда пользователь вводит телефон. Код уходит по SMS, сервер возвращает `flow = "login"` и `uuid`, по которым дальше подтверждается код.[page:1]

#### 4.1.2 Confirm SMS code (finish auth)

- **POST `/api/v1/auth`** (тот же endpoint).[page:1]
- **Headers**: same as above.
- **Body** (confirming SMS / 2FA):
  ````json
  {
    "login": "+79001234567",
    "code": "1234",
    "uuid": "a1b2c3d4e5"
  }
  ```[page:1]
  ````
- **Response (success) – HTTP 201**:
  ````json
  {
    "success": true,
    "data": {
      "user_token": "user_token_value",
      "user": {
        "id": 2001,
        "name": "John Doe",
        "phone": "+79001234567"
      }
    },
    "meta": {}
  }
  ```[page:1]
  ````

> RU: `user_token` сохраняем в сессии пользователя бота и дальше передаём в заголовке `Authorization: Bearer <partner_token>, User <user_token>` для операций, завязанных на пользователя (мои записи, отмена и т.д.).[page:1]

---

### 4.2 Bookform & i18n

#### 4.2.1 Get booking form config

- **GET `/api/v1/bookform/{id}`**.[page:1]
- **Path param**:
  - `id` – number, booking form ID (например, из `https://w123.yclients.com` → `123`).[page:1]
- **Headers**: partner bearer, `Accept`, `Content-Type`.
- **Example**:
  ````http
  GET /api/v1/bookform/123 HTTP/1.1
  Accept: application/vnd.yclients.v2+json
  Content-Type: application/json
  Authorization: Bearer <partner_token>
  ```[page:1]
  ````
- **Response (simplified)**:
  ````json
  {
    "success": true,
    "data": {
      "group_id": 0,
      "company_id": 1,
      "phone_confirmation": false,
      "steps": [
        { "step": "service", "title": "Услуга", "num": 1, "hidden": false },
        { "step": "master", "title": "Сотрудник", "num": 2, "hidden": false },
        { "step": "datetime", "title": "Дата и время", "num": 3, "hidden": false },
        { "step": "contact", "title": "Контакты", "num": 4, "hidden": false },
        { "step": "confirm", "title": "Подтверждение", "num": 5, "hidden": false }
      ]
    },
    "meta": {}
  }
  ```[page:1]
  ````

> RU: по `company_id` и `group_id` строим весь остальной флоу бота.[page:1]

#### 4.2.2 Get i18n strings

- **GET `/api/v1/i18n/{langCode}`**.[page:1]
- **Path param**: `langCode` (`ru-RU`, `en-US` и т.п.).[page:1]

---

### 4.3 Companies

#### 4.3.1 List companies (by group or id)

- **GET `/api/v1/companies`**.[page:1]
- **Query params**:
  - `group_id` (optional) – filter by network.
  - `company_id` (optional) – specific company (can be array‑ish).
- **Example**:
  ````http
  GET /api/v1/companies?group_id=10 HTTP/1.1
  Accept: application/vnd.yclients.v2+json
  Content-Type: application/json
  Authorization: Bearer <partner_token>
  ```[page:1]
  ````

#### 4.3.2 Get single company

- **GET `/api/v1/companies/{company_id}`**.[page:1]

---

### 4.4 Service categories & services

_(RU: без вариантов, один набор конкретных ручек)_

#### 4.4.1 List service categories for company

- **GET `/api/v1/company/{company_id}/service_categories`**.[page:1]
- **Path param**: `company_id`.
- **Response (simplified)**:
  ````json
  {
    "success": true,
    "data": [
      { "id": 10, "title": "Hair" },
      { "id": 11, "title": "Nails" }
    ],
    "meta": {}
  }
  ```[page:1]
  ````

#### 4.4.2 List services for company (with optional category)

- **GET `/api/v1/company/{company_id}/services`**.[page:1]
- **Query params**:
  - `category_id` (optional) – filter by category.
- **Response (simplified)**:
  ````json
  {
    "success": true,
    "data": [
      {
        "id": 1001,
        "title": "Haircut",
        "length": 3600,
        "price_min": 1500,
        "price_max": 2000,
        "allow_online": true
      }
    ],
    "meta": {}
  }
  ```[page:1]
  ````

> RU: бот показывает только `allow_online = true`.[page:1]

---

### 4.5 Staff

#### 4.5.1 List staff for company

- **GET `/api/v1/company/{company_id}/staff`**.[page:1]
- **Query params**:
  - `service_ids` (optional, comma‑separated): restrict to staff that can perform given service(s).
- **Example**:
  ````http
  GET /api/v1/company/1/staff?service_ids=1001 HTTP/1.1
  Accept: application/vnd.yclients.v2+json
  Content-Type: application/json
  Authorization: Bearer <partner_token>
  ```[page:1]
  ````
- **Response (simplified)**:
  ````json
  {
    "success": true,
    "data": [
      {
        "id": 10,
        "name": "Anna",
        "specialization": "Hair stylist",
        "online_booking_enabled": true
      }
    ],
    "meta": {}
  }
  ```[page:1]
  ````

> RU: если в `bookform.steps` для `master` есть “any master”, бот может предложить вариант “Любой мастер” отдельно от конкретных `staff.id`.[page:1]

---

### 4.6 Free time (available time slots)

#### 4.6.1 Get free time slots for booking

- **GET `/api/v1/book_times`**.[page:1]
- **Query params**:
  - `company_id` – required.
  - `staff_id` – optional (конкретный сотрудник, если выбран).
  - `service_ids` – required, comma‑separated list of service IDs.
  - `from` – ISO date, start of range (e.g. `2026-01-19`).
  - `to` – ISO date, end of range.[page:1]
- **Example**:
  ````http
  GET /api/v1/book_times?company_id=1&staff_id=10&service_ids=1001&from=2026-01-19&to=2026-01-19 HTTP/1.1
  Accept: application/vnd.yclients.v2+json
  Content-Type: application/json
  Authorization: Bearer <partner_token>
  ```[page:1]
  ````
- **Response (simplified)**:
  ````json
  {
    "success": true,
    "data": [
      "2026-01-19T15:00:00.000+03:00",
      "2026-01-19T16:00:00.000+03:00"
    ],
    "meta": {}
  }
  ```[page:1]
  ````

> RU: бот показывает пользователю именно эти слоты; перед бронированием можно ещё раз проверить, что слот всё ещё есть.[page:1]

---

### 4.7 Records (create, list, cancel, reschedule)

#### 4.7.1 Create booking / record

- **POST `/api/v1/book_record`**.[page:1]
- **Headers**:
  - `Accept: application/vnd.yclients.v2+json`
  - `Content-Type: application/json`
  - `Authorization: Bearer <partner_token>` или
  - `Authorization: Bearer <partner_token>, User <user_token>` (если бизнес‑логика требует user‑context).[page:1]
- **Body (minimal)**:
  ````json
  {
    "company_id": 1,
    "staff_id": 10,
    "services": [
      { "id": 1001 }
    ],
    "datetime": "2026-01-19T15:00:00.000+03:00",
    "client": {
      "name": "John Doe",
      "phone": "+79001234567",
      "email": "john@example.com"
    },
    "comment": "Please do not be late"
  }
  ```[page:1]
  ````
- **Response (simplified)**:
  ````json
  {
    "success": true,
    "data": {
      "id": 50001,
      "company_id": 1,
      "staff_id": 10,
      "services": [
        { "id": 1001, "title": "Haircut" }
      ],
      "datetime": "2026-01-19T15:00:00.000+03:00",
      "client": {
        "id": 2001,
        "name": "John Doe",
        "phone": "+79001234567"
      }
    },
    "meta": {}
  }
  ```[page:1]
  ````

> RU: `services` — массив объектов с `id`; `client` — контакты, которые бот собирает в шаге “Контакты”.[page:1]

#### 4.7.2 Get user records (future/past)

- **GET `/api/v1/user/records`**.[page:1]
- **Headers**:
  - `Accept: application/vnd.yclients.v2+json`
  - `Content-Type: application/json`
  - `Authorization: Bearer <partner_token>, User <user_token>`.[page:1]
- **Query params**:
  - `company_id` – required.
  - `from` – optional ISO date/time, start range.
  - `to` – optional ISO date/time, end range.[page:1]
- **Example**:
  ````http
  GET /api/v1/user/records?company_id=1&from=2026-01-01&to=2026-02-01 HTTP/1.1
  Accept: application/vnd.yclients.v2+json
  Content-Type: application/json
  Authorization: Bearer <partner_token>, User <user_token>
  ```[page:1]
  ````

> RU: бот показывает по этой ручке “Мои записи”.[page:1]

#### 4.7.3 Cancel record

- **DELETE `/api/v1/records/{record_id}`**.[page:1]
- **Headers**:
  - `Accept: application/vnd.yclients.v2+json`
  - `Authorization: Bearer <partner_token>, User <user_token>`.[page:1]
- **Example**:
  ````http
  DELETE /api/v1/records/50001 HTTP/1.1
  Accept: application/vnd.yclients.v2+json
  Authorization: Bearer <partner_token>, User <user_token>
  ```[page:1]
  ````
- **Error cases**:
  - If cancellation is forbidden (e.g. too close to visit time), API returns `success = false` и текст ошибки, соответствующий i18n `record.error_cancel_record_*`.[page:1]

#### 4.7.4 Reschedule record

- **PUT `/api/v1/records/{record_id}`**.[page:1]
- **Headers**: same as cancel.
- **Body (minimal)**:
  ````json
  {
    "datetime": "2026-01-20T15:00:00.000+03:00"
  }
  ```[page:1]
  ````
- **Flow**:
  - Получить новые свободные слоты через `/api/v1/book_times`.
  - Отправить `PUT /api/v1/records/{record_id}` с новым `datetime` (и при необходимости `staff_id`/`services`).[page:1]

---

## 5. SMS/phone login flow (end‑to‑end)

_(RU: законченное описание флоу)_

1. **User enters phone in Telegram**.

   - Bot calls `POST /api/v1/auth` with body `{ "login": "<phone>" }`.
   - If response `data.flow == "login"`, SMS was sent and `uuid` is provided.[page:1]

2. **User receives SMS code and enters it in Telegram**.

   - Bot calls `POST /api/v1/auth` with body `{ "login": "<phone>", "code": "<sms_code>", "uuid": "<uuid>" }`.
   - On HTTP 201 with `data.user_token`, auth is successful.[page:1]

3. **Bot stores `user_token` in user session**.
   - All user‑specific operations (list records, cancel, reschedule) must include header  
     `Authorization: Bearer <partner_token>, User <user_token>`.[page:1]

> RU: не придумывать иных вариантов SMS‑флоу; использовать только эти два шага, один endpoint и описанные поля.[page:1]

---

## 6. Pagination & filters

_(RU: общее правило)_

- List endpoints (`/companies`, `/company/{id}/services`, `/company/{id}/staff`, `/user/records`) могут поддерживать параметры пагинации (`page`, `count`/`limit`) и сортировки.[page:1]
- Если параметры не описаны явно в этой спецификации:
  - LLM должна использовать значения по умолчанию (без ручной пагинации) или добавить только `page` и `count`, если это указано в конкретном описании эндпоинта в коде/примерe, и не выдумывать новые поля.[page:1]

---

## 7. Error handling rules

_(RU: как бот обрабатывает ошибки)_

- Always check `success` in response; if `false` or missing, treat as error.[page:1]
- Use returned error messages when they are user‑friendly (e.g. cancellation forbidden).
- Respect rate limits; avoid rapid retry loops.
- For booking: before final `POST /api/v1/book_record`, ensure selected slot is still in `/api/v1/book_times`.[page:1]

---

## 8. Telegram bot architecture (TypeScript)

_(RU: структура кода)_

Implement bot in TypeScript (e.g. `telegraf`).  
Maintain per‑user state:

- `companyId`, `serviceIds`, `staffId | "any"`, chosen date and time, user `phone`, `name`, `userToken`, current step.[page:1]

Create `yclientsApi.ts` with functions mapping 1‑к‑1 на эндпоинты:[page:1]

- `getBookFormConfig(bookFormId: number)` → `GET /api/v1/bookform/{id}`
- `getI18n(lang: string)` → `GET /api/v1/i18n/{lang}`
- `listCompanies(params)` → `GET /api/v1/companies`
- `getCompany(companyId)` → `GET /api/v1/companies/{company_id}`
- `listServiceCategories(companyId)` → `GET /api/v1/company/{company_id}/service_categories`
- `listServices(companyId, filters)` → `GET /api/v1/company/{company_id}/services`
- `listStaff(companyId, filters)` → `GET /api/v1/company/{company_id}/staff`
- `getFreeTimes(params)` → `GET /api/v1/book_times`
- `startAuth(login)` → `POST /api/v1/auth`
- `confirmAuth(login, code, uuid)` → `POST /api/v1/auth`
- `createRecord(payload)` → `POST /api/v1/book_record`
- `getUserRecords(params)` → `GET /api/v1/user/records`
- `cancelRecord(recordId)` → `DELETE /api/v1/records/{record_id}`
- `rescheduleRecord(recordId, payload)` → `PUT /api/v1/records/{record_id}`.[page:1]

> RU: любые другие ручки добавлять только при явной необходимости и строго по этому же формату “метод – URL – поля”.[page:1]

---

## 9. Behavioral rules for the LLM

_(RU: что модель делает / не делает)_

- Use exactly the endpoints, methods and fields defined in this spec; do not invent alternate URLs or parameters.[page:1]
- If some behavior is unclear, prefer leaving it out rather than guessing payloads.
- Follow company rules reflected in API responses (no‑cancel windows, prepayment, etc.).
- Keep user‑facing messages concise; reuse API error messages when they make sense.[page:1]
