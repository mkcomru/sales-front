# 005 — Frontend ↔ Backend Sync

> Привести sales-front в соответствие с текущим состоянием backend API после планов 018–027.

---

## Зачем это делаем

Бэкенд прошёл через крупные архитектурные изменения: Order как отдельная сущность, кастомные стадии, customer_fields, задачи, расписание менеджеров. Фронтенд остался на устаревших контрактах — стадии привязаны к Thread (которого больше нет), используются hardcoded стадии из mock-данных, вместо `customer_fields` читается deprecated `quiz_answers`.

**Что решаем:**
- Фронтенд нельзя использовать для тестирования/демонстрации реальных фич
- UI показывает заглушки вместо настоящих данных (funnel, stages, orders)
- Пользователь не видит заказы, задачи, расписание — ключевые сущности продукта

**Что станет возможным:**
- Полноценное ручное тестирование всех backend-фич через UI
- Демонстрация продукта клиентам
- Работа с заказами, стадиями, задачами, расписанием из единого интерфейса

---

## Scope

**В scope:**
- Обновление типов, сервисов, эндпоинтов, компонентов для всех backend-изменений из планов 018–027
- Минимальные UI для новых сущностей (orders, tasks, stages CRUD, schedule)
- Prompt Addons (= Workflow Addons) UI для привязки к коннекторам

**Вне scope:**
- ❌ WebSocket интеграция (отдельная задача, plan 025-ws)
- ❌ Новые backend-эндпоинты или бизнес-логика
- ❌ Сложные UI-паттерны (drag-n-drop reorder, visual condition editor)

**Ограничение:** Backend не меняем (допускается только добавление полей в существующие response-схемы, если нужно).

---

## Current State → Target State

### Thread List Response (backend уже возвращает)

```
ChatThreadSummary:
  thread_id, company_id, channel_type, conversation_id
  customer_id, customer_name
  last_message_preview, last_message_at, unread_count
  assistant_active, state
  active_order: OrderSummary | null    ← NEW (stage, assignee, order_id внутри)
```

`OrderSummary` includes:
- `id` (order_id), `order_number`
- `stage: StageInfo | null` → `{id, name, color, position}`
- `assignee: AssigneeInfo | null` → `{id, user_id, first_name, last_name, role}`

### Стадии (backend уже возвращает)

```
StageTemplateResponse:
  id, company_id, name, color, position
  is_final, auto_close, is_system
  transition_condition: dict | null
```

### Customer (backend уже возвращает)

```
CustomerDetailResponse:
  customer_id, user_id, name, username, phone, email, avatar_url
  customer_fields: dict          ← вместо quiz_answers
  fields_schema: list[CustomerFieldSchema]  ← для typed UI
  rejected, rejection_reason, notes, meta
```

### Order (backend уже возвращает)

```
OrderResponse:
  id, order_number, name
  customer: CustomerInfo
  assignee: AssigneeInfo | null
  stage: StageInfo | null
  order_fields: dict
  initial_channel, result, frozen
  created_at, updated_at, closed_at
```

### Task (backend уже возвращает)

```
TaskResponse:
  id, company_id, order_id
  title, description, type, due_date
  assignee_id, auto_action
  completed, completed_at, completed_by_type, cancelled_at
  is_overdue, attempt_count, failure_reason
  created_at, created_by_id
```

### CompanyUser Schedule (backend уже возвращает)

```
CompanyUserScheduleResponse:
  work_schedule, is_available
  schedule_description, is_working_now
  next_available_at, next_available_at_local, next_available_timezone
```

### Field (backend уже возвращает)

```
FieldResponse:
  id, name, question, type, required, display_name
  level: "customer" | "order"    ← NEW
  is_system: bool                ← NEW
  category_id, product_id, options
```

### Prompt Addon (= Workflow Addon, backend уже возвращает)

```
PromptAddonResponse:
  id, company_id, name
  qualification_workflow, qualification_examples
```

Connector has `prompt_addon_id` (FK, nullable) — привязка addon к коннектору.

---

## Implementation Phases

### Phase 1: Types & API Layer Foundation

Обновить/создать все TypeScript типы и API endpoints до начала работы с компонентами.

#### 1.1. Обновить `types/api.ts`

- [ ] Добавить `StageInfo`: `{ id: number; name: string; color: string | null; position: number }`
- [ ] Добавить `AssigneeInfo`: `{ id: number; user_id: number; first_name: string; last_name: string; role: string }`
- [ ] Добавить `OrderSummary`: `{ id: number; order_number: number; stage: StageInfo | null; assignee: AssigneeInfo | null }`
- [ ] Обновить `ThreadListItem`: убрать `stage?`, `stage_id?`, `assignee?`; добавить `active_order: OrderSummary | null`
- [ ] Добавить `OrderResponse`: полная модель заказа (id, order_number, name, customer, assignee, stage, order_fields, initial_channel, result, frozen, created_at, updated_at, closed_at)
- [ ] Добавить `CustomerInfo`: `{ id: number; user_id: string; name: string | null }`
- [ ] Обновить `Customer`: `quiz_answers` → `customer_fields: Record<string, any>`, добавить `fields_schema`, `rejected`, `notes`
- [ ] Добавить `StageTemplate`: `{ id: number; company_id: number; name: string; color: string | null; position: number; is_final: boolean; auto_close: boolean; is_system: boolean; transition_condition: Record<string, any> | null }`
- [ ] Добавить `TaskResponse` с полными полями
- [ ] Добавить `CreateOrderTaskRequest`: `{ title: string; description?: string; type: string; due_date: string; assignee_id?: number; auto_action?: string }`
- [ ] Добавить `UpdateTaskRequest`: `{ title?: string; description?: string; due_date?: string; assignee_id?: number }`
- [ ] Обновить `CompanyField`: добавить `level: FieldLevel` и `is_system: boolean`
- [ ] Добавить `PromptAddon`: `{ id: number; company_id: number; name: string; qualification_workflow: string; qualification_examples: string }`
- [ ] Добавить `CompanyUserSchedule`: `{ work_schedule: any; is_available: boolean; schedule_description: string | null; is_working_now: boolean; next_available_at: string | null }`
- [ ] Обновить `CompanyMember`: добавить `work_schedule?: any`, `is_available?: boolean`
- [ ] Обновить `Connector`: добавить `prompt_addon_id: number | null`

#### 1.2. Обновить `types.ts`

- [ ] Убрать `FIXED_STAGES` usage из `ChatSession` — `dealStage` заменить на `order: OrderSummary | null`
- [ ] `CustomerDetails.quiz_answers` → `customer_fields`
- [ ] `Deal` type: `stage` → `stage: StageInfo | null`, убрать hardcoded union

#### 1.3. Обновить `services/api/endpoints.ts`

- [ ] Добавить `ORDERS` секцию:
  ```
  LIST: (companyId) => /companies/{companyId}/orders
  BY_ID: (companyId, orderId) => /companies/{companyId}/orders/{orderId}
  ASSIGNEE: (companyId, orderId) => /companies/{companyId}/orders/{orderId}/assignee
  CLOSE: (companyId, orderId) => /companies/{companyId}/orders/{orderId}/close
  FROZEN: (companyId, orderId) => /companies/{companyId}/orders/{orderId}/frozen
  LOGS: (companyId, orderId) => /companies/{companyId}/orders/{orderId}/logs
  RECALCULATE: (companyId, orderId) => /companies/{companyId}/orders/{orderId}/recalculate-stage
  STAGE_REQUIREMENTS: (companyId, orderId) => /companies/{companyId}/orders/{orderId}/stage-requirements
  CUSTOMER_ORDERS: (companyId, customerId) => /companies/{companyId}/customers/{customerId}/orders
  ```
- [ ] Добавить `STAGES` секцию:
  ```
  LIST: (companyId) => /companies/{companyId}/stages
  BY_ID: (companyId, stageId) => /companies/{companyId}/stages/{stageId}
  REORDER: (companyId) => /companies/{companyId}/stages/reorder
  RECALCULATE: (companyId) => /companies/{companyId}/stages/recalculate
  ```
- [ ] Добавить `TASKS` секцию:
  ```
  ORDER_TASKS: (companyId, orderId) => /companies/{companyId}/orders/{orderId}/tasks
  TASK_BY_ID: (companyId, orderId, taskId) => /companies/{companyId}/orders/{orderId}/tasks/{taskId}
  COMPLETE: (companyId, orderId, taskId) => .../tasks/{taskId}/complete
  CANCEL: (companyId, orderId, taskId) => .../tasks/{taskId}/cancel
  MY_TASKS: (companyId) => /companies/{companyId}/my-tasks
  ```
- [ ] Добавить `PROMPT_ADDONS` секцию:
  ```
  LIST: (companyId) => /companies/{companyId}/prompt-addons
  BY_ID: (companyId, addonId) => /companies/{companyId}/prompt-addons/{addonId}
  ```
- [ ] Добавить `COMPANY_USERS` секцию:
  ```
  UPDATE: (companyUserId) => /company-users/{companyUserId}
  SCHEDULE: (companyUserId) => /company-users/{companyUserId}/schedule
  ```
- [ ] Убрать `THREADS.STAGE` (deprecated, stage is on Order)
- [ ] Убрать `THREADS.ASSIGNEE` (deprecated, assignee is on Order)
- [ ] Обновить `CUSTOMERS.QUIZ_ANSWERS` → `CUSTOMERS.FIELDS: (companyId, customerId) => .../customers/{customerId}/fields`
- [ ] Добавить `CUSTOMERS.NOTES: (companyId, customerId) => .../customers/{customerId}/notes`

#### 1.4. Создать новые сервисы

- [ ] `services/orders.ts` — list, getById, updateAssignee, close, updateFrozen, getLogs, addComment
- [ ] `services/stages.ts` — list, create, update, delete, reorder
- [ ] `services/tasks.ts` — listForOrder, create, update, complete, cancel, myTasks
- [ ] `services/promptAddons.ts` — list, create, get, update, delete
- [ ] `services/schedule.ts` — getSchedule, updateCompanyUser

#### 1.5. Обновить существующие сервисы

- [ ] `services/threads.ts`: убрать `updateStage()`, `updateAssignee()`, `updateFields()` (moved to Orders)
- [ ] `services/customers.ts`: `updateQuizAnswers()` → `updateFields()`, endpoint `/fields` вместо `/quiz-answers`

---

### Phase 2: Thread → Order Data Flow

Обновить маппинг данных в hooks и компонентах чтобы stage/assignee читались из `active_order`.

#### 2.1. Обновить `hooks/useThreads.ts`

- [ ] Маппинг `ThreadListItem` → `ChatSession`:
  - `dealStage` = `t.active_order?.stage?.name || 'Без стадии'`
  - `assignee` = собрать из `t.active_order?.assignee`
  - Добавить `orderId` = `t.active_order?.id` в ChatSession
  - Добавить `orderStage` = `t.active_order?.stage` (полный StageInfo) в ChatSession
- [ ] Убрать чтение `t.stage`, `t.stage_id` — их больше нет

#### 2.2. Обновить `shared/constants/index.ts`

- [ ] Убрать `FIXED_STAGES` — стадии теперь динамические

#### 2.3. Создать `hooks/useStages.ts`

- [ ] Хук для загрузки стадий компании: `useStages(companyId)` → `{ stages, loading, refetch }`
- [ ] Используется в CustomerProfile, SalesFunnel, InboxPage

#### 2.4. Создать `hooks/useOrders.ts`

- [ ] Хук для загрузки заказов: `useOrders(companyId)` → `{ orders, loading, refetch }`
- [ ] Используется в SalesFunnel, Order detail

#### 2.5. Обновить `components/CustomerProfile.tsx`

- [ ] Stage dropdown: вместо `FIXED_STAGES` использовать динамические стадии из `useStages`
- [ ] Stage update: вызывать `ordersService.update(companyId, orderId, { stage_id })` вместо `threadsService.updateStage()`
- [ ] Assignee update: вызывать `ordersService.updateAssignee(companyId, orderId, assigneeId)` вместо `threadsService.updateAssignee()`
- [ ] Секция "Данные клиента": читать из `customer_fields` вместо `quiz_answers`
- [ ] Добавить отдельную секцию "Данные заказа" для order_fields (если есть active order)
- [ ] Update quiz → вызывать `customersService.updateFields()` вместо `updateQuizAnswers()`

#### 2.6. Обновить `pages/InboxPage.tsx`

- [ ] `onUpdateStage` → через Orders API
- [ ] `onUpdateAssignee` → через Orders API
- [ ] `onUpdateQuiz` → через `customersService.updateFields()`
- [ ] Загружать stages через `useStages(companyId)`

---

### Phase 3: Sales Funnel — Real Data

Заменить mock данные на реальные заказы и динамические стадии.

#### 3.1. Обновить `components/SalesFunnel.tsx`

- [ ] Загружать стадии через `stagesService.list(companyId)` → динамические колонки
- [ ] Загружать заказы через `ordersService.list(companyId)` → реальные карточки
- [ ] Группировать заказы по `order.stage.id` → по колонкам
- [ ] Каждая колонка: название стадии + цвет из `StageTemplate.color`
- [ ] Карточка заказа: customer name, order_number, assignee, last activity
- [ ] Убрать `MOCK_DEALS` и `Deal` type usage
- [ ] Отображать финальные стадии отдельно (is_final) или в конце

#### 3.2. Обновить `shared/constants/mockData.ts`

- [ ] Убрать `MOCK_DEALS` (или оставить как fallback, но не использовать)

---

### Phase 4: Customer Fields Migration

#### 4.1. Обновить отображение customer данных

- [ ] `CustomerProfile.tsx` секция "Данные клиента" → читать `customer_fields` + `fields_schema`
- [ ] Использовать `fields_schema` для typed rendering (select для enum, input для string, etc.)
- [ ] Разделить отображение: customer-level fields vs order-level fields
- [ ] Order fields показывать в отдельной секции "Данные заказа"

#### 4.2. Обновить `CompanyField` тип и фильтрацию

- [ ] При загрузке fields добавить `?level=customer` / `?level=order` фильтрацию
- [ ] В AgentSettings показывать поля в двух секциях: Customer Fields и Order Fields
- [ ] Системные поля (`is_system=true`) отмечать визуально (badge/icon)
- [ ] Системные поля нельзя удалять (скрыть кнопку удаления)

---

### Phase 5: Stages CRUD

Минимальный UI для управления стадиями.

#### 5.1. Добавить Stages Management в Settings

- [ ] Новый раздел в Settings: "Воронка продаж" / "Стадии"
- [ ] Список стадий компании с цветом и позицией
- [ ] Создание новой стадии (name, color, is_final)
- [ ] Редактирование стадии (name, color)
- [ ] Удаление стадии (с предупреждением)
- [ ] Reorder: простой список с кнопками up/down (drag-n-drop вне scope)
- [ ] Пометка `is_system` (нельзя удалить/редактировать position)

---

### Phase 6: Order Management

Минимальный UI для работы с заказами.

#### 6.1. Order Detail Panel

- [ ] При клике на заказ (из funnel или inbox) — показать детали заказа
- [ ] Отображение: order_number, name, stage, assignee, order_fields, result, created_at
- [ ] Frozen toggle (PATCH /orders/{id}/frozen)
- [ ] Close order button (POST /orders/{id}/close) с выбором result (won/lost)

#### 6.2. Order Logs

- [ ] Подгрузка логов заказа (GET /orders/{id}/logs)
- [ ] Отображение timeline: stage changes, field changes, comments
- [ ] Форма добавления комментария (POST /orders/{id}/logs)

#### 6.3. Customer Order History

- [ ] В CustomerProfile: секция "История заказов"
- [ ] Список заказов клиента (GET /customers/{id}/orders)
- [ ] Каждый заказ: номер, стадия, результат, дата

---

### Phase 7: Tasks

#### 7.1. Task List per Order

- [ ] В Order detail panel: секция "Задачи"
- [ ] Список задач заказа (GET /orders/{orderId}/tasks)
- [ ] Показать: title, due_date, type, assignee, completed, is_overdue
- [ ] Кнопки: Complete, Cancel

#### 7.2. Create Task

- [ ] Форма создания задачи: title, description, due_date, assignee (dropdown из managers)
- [ ] Type = "manual" (AI_SCHEDULED задачи создаются ботом, не менеджером)

#### 7.3. My Tasks View

- [ ] Новая страница/раздел: "Мои задачи"
- [ ] Список задач текущего пользователя (GET /my-tasks)
- [ ] Группировка: overdue, today, upcoming
- [ ] Quick actions: complete, open order

---

### Phase 8: Manager Schedule & Prompt Addons

#### 8.1. Schedule Display

- [ ] В Settings → Team section: рядом с каждым менеджером показать schedule info
- [ ] Availability toggle (is_available) — PATCH /company-users/{id}
- [ ] Отображение schedule_description ("Пн-Пт 09:00-18:00")
- [ ] Индикатор is_working_now (зелёный/серый dot)

#### 8.2. Schedule Editor (basic)

- [ ] При клике на расписание: JSON-based editor или простая форма
- [ ] Timezone selector
- [ ] Weekly schedule: 7 дней, start/end для каждого
- [ ] Save → PATCH /company-users/{id} с work_schedule

#### 8.3. Prompt Addons UI

- [ ] В Settings: новый раздел "Prompt Addons" (или "Workflow Addons")
- [ ] CRUD: list, create, edit, delete prompt addons
- [ ] Поля: name, qualification_workflow (textarea), qualification_examples (textarea)
- [ ] В настройках коннектора: dropdown для привязки prompt_addon_id

---

## Decisions

| Вопрос | Решение |
|--------|---------|
| Менять ли backend? | Нет (только frontend) |
| WebSocket? | Исключён, отдельная задача |
| SalesFunnel: drag-n-drop? | Нет, обычные колонки |
| Stages reorder UI | Up/down кнопки (не drag-n-drop) |
| Transition conditions editor | Нет (JSON в raw виде для debug, если нужно) |
| Order creation from UI? | Нет (заказы создаются через inbound flow или формы) |
| Task scheduler UI? | Нет (только CRUD для manual tasks + view AI tasks) |

---

## Files to Create

| File | Purpose |
|------|---------|
| `services/orders.ts` | Order CRUD service |
| `services/stages.ts` | Stage CRUD service |
| `services/tasks.ts` | Task CRUD service |
| `services/promptAddons.ts` | Prompt Addon CRUD service |
| `services/schedule.ts` | CompanyUser schedule service |
| `hooks/useStages.ts` | Dynamic stages hook |
| `hooks/useOrders.ts` | Orders loading hook |
| `hooks/useTasks.ts` | Tasks loading hook |

## Files to Modify

| File | Changes |
|------|---------|
| `types/api.ts` | Add Order, Stage, Task, PromptAddon, Schedule types; update Thread, Customer, Field types |
| `types.ts` | Update ChatSession, CustomerDetails, Deal; remove FIXED_STAGES dependency |
| `services/api/endpoints.ts` | Add ORDERS, STAGES, TASKS, PROMPT_ADDONS, COMPANY_USERS sections; remove deprecated Thread endpoints |
| `services/threads.ts` | Remove updateStage, updateAssignee, updateFields |
| `services/customers.ts` | updateQuizAnswers → updateFields |
| `hooks/useThreads.ts` | Read stage/assignee from active_order |
| `shared/constants/index.ts` | Remove FIXED_STAGES |
| `components/CustomerProfile.tsx` | Dynamic stages, order-based updates, customer_fields |
| `components/SalesFunnel.tsx` | Real data instead of mocks |
| `pages/InboxPage.tsx` | Order-based stage/assignee updates |
| `components/AgentSettings.tsx` | Field level separation UI |
| `components/ChannelsSettings.tsx` | Prompt addon binding to connector |

---

## Implementation Order

1. **Phase 1** — Types & API layer (foundation, no visible changes)
2. **Phase 2** — Thread → Order data flow (fix broken reads/writes)
3. **Phase 3** — Sales Funnel real data
4. **Phase 4** — Customer fields migration
5. **Phase 5** — Stages CRUD
6. **Phase 6** — Order management
7. **Phase 7** — Tasks
8. **Phase 8** — Schedule & Prompt Addons

Phases 1–4 are **critical** (без них UI принципиально сломан).
Phases 5–8 are **feature additions** (можно делать инкрементально).

---

## Risks

1. **Thread list backward compat** — Backend может ещё возвращать top-level `stage`/`assignee` рядом с `active_order`. Нужно проверить и отдать приоритет `active_order`.
2. **quiz_answers endpoint** — Может быть удалён. Если фронт вызывает `/quiz-answers` и получает 404, нужно срочно мигрировать на `/fields`.
3. **FIXED_STAGES removal** — Компоненты, зависящие от `FIXED_STAGES`, сломаются до подключения динамических стадий. Фазы 1–2 должны идти вместе.
