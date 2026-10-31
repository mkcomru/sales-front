# Plan 007: Система уведомлений — фронтенд (DEVS-241)

## Зачем это делаем

Сейчас менеджеры не замечают, когда бот передаёт им чат: нет ни визуального сигнала, ни звука, ни счётчика. Это приводит к задержкам ответа и потере лидов. Задача решает проблему на трёх уровнях:

- **Моментальная реакция** — WS pop-up + звук при handoff, менеджер мгновенно видит новый чат
- **Счётчик непрочитанных** — колокольчик в хедере с числом, никогда не теряешь уведомления пока в приложении
- **Кросс-компания** — бейджи на странице выбора компании, менеджер при входе видит где ждут

API-контракт задокументирован в `.claude/docs/ai/notifications/api-handoff.md`.

---

## Phase 1: Foundation — типы, эндпоинты, сервис

**Файлы:**
- `types/api.ts` — добавить типы
- `services/api/endpoints.ts` — добавить NOTIFICATIONS
- `services/notifications.ts` — новый файл

**Типы в `types/api.ts`** (добавить в конец файла):

```typescript
export type NotificationType = 'handoff_assigned';

export interface NotificationResponse {
  id: number;
  company_id: number;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

export interface NotificationRecipientResponse {
  id: number;
  notification: NotificationResponse;
  is_read: boolean;
  read_at: string | null;
}

export interface NotificationListResponse {
  items: NotificationRecipientResponse[];
  total: number;
  unread_count: number;
}

export interface CompanyNotificationSummary {
  company_id: number;
  unread_count: number;
}
```

**Эндпоинты в `services/api/endpoints.ts`** — добавить блок `NOTIFICATIONS`:

```typescript
NOTIFICATIONS: {
  LIST: (companyId: number) => `/api/v1/companies/${companyId}/notifications`,
  UNREAD_COUNT: (companyId: number) => `/api/v1/companies/${companyId}/notifications/unread-count`,
  READ: (companyId: number, recipientId: number) =>
    `/api/v1/companies/${companyId}/notifications/${recipientId}/read`,
  READ_ALL: (companyId: number) => `/api/v1/companies/${companyId}/notifications/read-all`,
  SUMMARY: '/api/v1/notifications/summary',
},
```

**`services/notifications.ts`** — новый файл:

```typescript
import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import type {
  NotificationListResponse,
  NotificationRecipientResponse,
  CompanyNotificationSummary,
} from '../types/api';

export const notificationsService = {
  getList(companyId: number, params?: { limit?: number; offset?: number; unread_only?: boolean }) {
    return apiClient
      .get<NotificationListResponse>(API_ENDPOINTS.NOTIFICATIONS.LIST(companyId), { params })
      .then((r) => r.data);
  },

  getUnreadCount(companyId: number) {
    return apiClient
      .get<{ count: number }>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT(companyId))
      .then((r) => r.data.count);
  },

  markRead(companyId: number, recipientId: number) {
    return apiClient
      .post<NotificationRecipientResponse>(API_ENDPOINTS.NOTIFICATIONS.READ(companyId, recipientId))
      .then((r) => r.data);
  },

  markAllRead(companyId: number) {
    return apiClient
      .post<{ updated: number }>(API_ENDPOINTS.NOTIFICATIONS.READ_ALL(companyId))
      .then((r) => r.data);
  },

  getSummary() {
    return apiClient
      .get<CompanyNotificationSummary[]>(API_ENDPOINTS.NOTIFICATIONS.SUMMARY)
      .then((r) => r.data);
  },
};
```

---

## Phase 2: NotificationContext — состояние + WS-подписка

**Файлы:**
- `contexts/NotificationContext.tsx` — новый файл

**Зависимости от Phase 1:** `notificationsService`, типы `NotificationRecipientResponse`

Контекст живёт внутри `WebSocketProvider` (подписывается на `user:{userId}` через `useRealtimeEvent`) и `IdentityProvider` (читает `currentUser.id`).

```typescript
// contexts/NotificationContext.tsx
import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import { useRealtimeEvent } from '../hooks/useRealtimeEvent';
import { useIdentityContext } from './IdentityContext';
import { notificationsService } from '../services/notifications';
import type { NotificationRecipientResponse } from '../types/api';
import type { RealtimeEvent } from '../hooks/useWebSocket';

// --- типы ---
interface NotificationState {
  items: NotificationRecipientResponse[];
  unread_count: number;
  isLoaded: boolean;
  pendingToast: NotificationRecipientResponse | null; // WS pop-up trigger
}

type NotificationAction =
  | { type: 'LOAD'; payload: { items: NotificationRecipientResponse[]; unread_count: number } }
  | { type: 'PREPEND'; payload: NotificationRecipientResponse }
  | { type: 'MARK_READ'; payload: number } // recipientId
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR_PENDING_TOAST' };

// --- reducer ---
function reducer(state: NotificationState, action: NotificationAction): NotificationState { ... }

// --- context value ---
interface NotificationContextType {
  state: NotificationState;
  load: (companyId: number) => Promise<void>;
  markRead: (companyId: number, recipientId: number) => Promise<void>;
  markAllRead: (companyId: number) => Promise<void>;
  clearPendingToast: () => void;
}

// --- provider ---
export const NotificationProvider: React.FC<{ companyId: number; children: ReactNode }> = ({ companyId, children }) => {
  const { identityState } = useIdentityContext();
  const userId = identityState.currentUser?.id;
  const topic = userId ? `user:${userId}` : '';

  // ...reducer, callbacks...

  useRealtimeEvent(topic, (event: RealtimeEvent) => {
    if (event.event_type !== 'notification') return;
    const p = event.payload;
    const item: NotificationRecipientResponse = { ... }; // собираем из payload
    dispatch({ type: 'PREPEND', payload: item });
    // pendingToast тоже устанавливается — компонент HandoffNotificationToast реагирует на него
  });

  // Загружаем при монтировании
  useEffect(() => { load(companyId); }, [companyId]);

  return <NotificationContext.Provider value={...}>{children}</NotificationContext.Provider>;
};

export function useNotificationContext(): NotificationContextType { ... }
```

**Интеграция в `Workspace.tsx`:** обернуть `<Layout />` в `<NotificationProvider companyId={companyId}>` внутри `WebSocketProvider`:

```tsx
// Workspace.tsx — внутри WorkspaceContent, после WebSocketProvider
<WebSocketProvider value={ws}>
  <NotificationProvider companyId={companyId!}>
    <Layout />
  </NotificationProvider>
</WebSocketProvider>
```

---

## Phase 3: HandoffNotificationToast + звук

**Файлы:**
- `utils/notificationSound.ts` — новый файл (Web Audio API, без внешних файлов)
- `components/notifications/HandoffNotificationToast.tsx` — новый файл

**`utils/notificationSound.ts`** — генерирует ding через Web Audio API:

```typescript
export function playNotificationSound(): void {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}
```

**`components/notifications/HandoffNotificationToast.tsx`** — pop-up в правом нижнем углу:

- Читает `state.pendingToast` из `useNotificationContext()`
- При изменении `pendingToast !== null`: показывает pop-up + вызывает `playNotificationSound()`
- Через 6 секунд автоматически исчезает (или по клику кнопки закрытия)
- Кнопка "Открыть чат" → `navigate(`/${companyId}/inbox`)` и устанавливает `selectedChatId` через `useChatContext` если `payload.order_id` доступен
- Вызывает `clearPendingToast()` при закрытии

Компонент рендерится в `Layout.tsx` — добавить `<HandoffNotificationToast />` в конец JSX (рядом с `UserProfileModal`).

---

## Phase 4: NotificationBell — подключение реальных данных

**Файлы:**
- `components/NotificationBell.tsx` — переписать с нуля поверх существующей вёрстки

**Зависимости от Phase 2:** `useNotificationContext()`, `useParams` для `companyId`

Поведение:
- Бейдж: показывать если `state.unread_count > 0`, показывать число если > 0
- Открытие панели: если `!state.isLoaded` — вызвать `load(companyId)` (на случай если не загрузилось)
- Список: отрендерить `state.items`, непрочитанные выделены фоном
- Клик по уведомлению: `markRead(companyId, item.id)` + навигация через `payload.order_id` в inbox
- Кнопка "Все прочитано": `markAllRead(companyId)`
- Иконка для `handoff_assigned`: `MessageSquare` из lucide

Вёрстку существующего компонента сохранить (hover-открытие через `onMouseEnter/Leave`), только подключить реальные данные.

---

## Phase 5: WorkspaceHeader — добавить колокольчик

**Файлы:**
- `components/workspace/WorkspaceHeader.tsx`

Добавить `<NotificationBell />` в `rightControls` перед разделителем и кнопкой баланса:

```tsx
// В rightControls, первым элементом:
<NotificationBell />
<div className="h-4 w-px bg-gray-100" />
// ... остальное
```

---

## Phase 6: SelectCompany — бейджи непрочитанных

**Файлы:**
- `components/SelectCompany.tsx` — добавить prop `unreadCounts`
- `components/SelectCompanyPage.tsx` — fetch summary, передать в SelectCompany

**`SelectCompany.tsx`** — добавить prop:

```typescript
interface SelectCompanyProps {
  // ... существующие
  unreadCounts: Record<number, number>; // company_id -> unread_count
}
```

На карточке компании добавить бейдж если `unreadCounts[company.company_id] > 0`:

```tsx
{(unreadCounts[company.company_id] ?? 0) > 0 && (
  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
    {unreadCounts[company.company_id]}
  </span>
)}
```

**`SelectCompanyPage.tsx`** — добавить fetch в `fetchUserData` (параллельно с `GET /users/me`):

```typescript
const [user, summary] = await Promise.all([
  apiClient.get<User>('/api/v1/users/me'),
  notificationsService.getSummary().catch(() => [] as CompanyNotificationSummary[]),
]);
// summary -> Record<number, number>
const unreadCounts = Object.fromEntries(summary.map((s) => [s.company_id, s.unread_count]));
```

Передать `unreadCounts` в `<SelectCompany unreadCounts={unreadCounts} ... />`.

---

## Порядок выполнения

1. Phase 1 (Foundation) — независима, начать с неё
2. Phase 2 (Context) — после Phase 1
3. Phase 3 (Toast + звук) — после Phase 2
4. Phase 4 (NotificationBell) — после Phase 2
5. Phase 5 (WorkspaceHeader) — после Phase 4
6. Phase 6 (SelectCompany badges) — после Phase 1, независима от Phase 2–5

---

## Рекомендуемая модель для выполнения

**Claude Sonnet 4.6**

- Затронуто ~10 файлов в 1 модуле (sales-front)
- Есть новые файлы, но все в одном репозитории
- Чёткий план с конкретными сигнатурами и примерами кода
- Нет рисков миграций или ломающих изменений в других модулях
