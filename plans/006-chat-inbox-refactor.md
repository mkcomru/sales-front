# 006 — Рефакторинг ChatWindow и MobileInbox (sales-front)

> План **имплементации**: декомпозиция двух крупных компонентов, вынос общей логики в переиспользуемые модули, контроль паритета поведения через **замороженные копии** до рефакторинга.

## Objective

Разбить `sales-front/components/ChatWindow.tsx` и `sales-front/components/mobile/MobileInbox.tsx` на согласованные подкомпоненты и хуки, устранить дублирование (группировка сообщений, стили пузырей, вложения, голос), сохранить UX и все сценарии. Публичные контракты для родителей (`InboxView`, страницы с `MobileInbox`) по возможности **не ломать**.

## Зачем это делаем

- **Проблема:** оба файла — ~900+ строк, в них смешаны скролл, анимации, загрузка артефактов, голос, AI-перехват и рендер тредов; правки дорогие и чреваты регрессиями.
- **Ценность UX/продукта:** не меняется напрямую, но снижается риск поломок инбокса и ускоряется доставка фич (вложения, голос, мобильный чат) без копипаста между desktop и mobile.
- **Что станет возможным:** единая точка правды для «как рисуем сообщения и вложения»; проще синхронизировать поведение `ChatWindow` и мобильного чата; проще тестировать и ревьюить изменения по частям.

## Context

- `ChatWindow` используется из `components/workspace/InboxView.tsx`.
- `MobileInbox` — полноэкранный мобильный инбокс (список тредов + чат + свой layout, safe-area, `VoicePreviewBar` и т.д.).
- Уже есть `components/chat/*` (артефакты, голос), `hooks/useVoiceRecorder`, утилиты `artifactKinds`, `voiceBubbleSurface`, `microphoneErrors`.
- В обоих файлах **дублируются**: `detectAttachmentType`, `groupMessages` (чуть разные типы строк), логика пузырей (`getBubbleStyles` / `bubbleStyle`), подписи авторов, частично рендер вложений/голоса.

## Phase 1 — Базовые копии для проверки паритета (обязательный гейт)

**Цель:** зафиксировать эталон «как было до рефакторинга», чтобы после каждого крупного шага можно было сравнить поведение и при необходимости диффать логику построчно.

**Файлы (создать, не подключать к приложению):**

| Копия | Источник |
|--------|-----------|
| `sales-front/components/ChatWindow.pre-refactor.tsx` | полная копия текущего `ChatWindow.tsx` |
| `sales-front/components/mobile/MobileInbox.pre-refactor.tsx` | полная копия текущего `MobileInbox.tsx` |

**Правила:**

- В начале каждого файла-копии: короткий комментарий — *reference-only, not imported; frozen at &lt;commit&gt; for parity checks*.
- Не экспортировать из `index` / не импортировать нигде в рантайме.
- Отдельный коммит только с этими двумя файлами (или явный шаг PR), чтобы в истории был чистый «снимок».

**Зависимости:** нет.

**Критерий готовности:** оба файла добавлены, **`npm run build`** без ошибок (копии не в графе импортов).

---

## Phase 2 — Общий слой сообщений и вложений (без изменения экранов)

**Цель:** вынести то, что **одинаково по смыслу** между desktop и mobile, в переиспользуемые модули с явным API.

**Создать / изменить (предложение по размещению):**

| Модуль | Содержимое |
|--------|------------|
| `sales-front/components/chat/messageGrouping.ts` | единая `groupMessages(messages): MessageThreadRow[]` (один тип строки); устранить расхождение «последнее сообщение в буфере» vs «ключ автора» между двумя копиями — сверить с обеими `.pre-refactor` и выбрать корректную семантику. |
| `sales-front/components/chat/messageBubbleStyles.ts` | функция стилей пузыря + флаги (`isClient`, …); параметр **`variant: 'desktop' | 'mobile'`** (или отдельные class map), чтобы сохранить текущий визуал обоих экранов без слияния в один Tailwind. |
| `sales-front/components/chat/messageAuthorLabel.ts` | `getAuthorLabel(msg, variant?)` — явно зафиксировать отличия («AI Assistant» vs «AI») через variant или опции. |
| `sales-front/components/chat/attachmentTypes.ts` | `detectAttachmentType(file)` |
| `sales-front/components/chat/MessageBubbleGroup.tsx` | общий мемо-компонент группы пузырей: контент, артефакты (`ArtifactImageDisplay`, `VoiceMessageBar`, `ArtifactDocumentLink`), failed state, плейсхолдеры изображений — с пропами `companyId`, `variant` для классов. |
| `sales-front/components/chat/SystemMessageGroup.tsx` | общий мемо-компонент системных сообщений + анимация «новое» по `Set` id. |

**Зависимости:** Phase 1 завершена (копии есть для сверки при переносе).

**Критерий готовности:** новые модули компилируются; **старые** `ChatWindow.tsx` / `MobileInbox.tsx` в этом фазе **ещё не обязаны** их использовать (можно подключить в Phase 3/5), либо минимальный «тонкий» импорт только если нужно для инкрементальной проверки.

---

## Phase 3 — Рефакторинг `ChatWindow.tsx`

**Файлы:** `sales-front/components/ChatWindow.tsx`, при необходимости новые: `ChatHeader.tsx`, `ChatTranscript.tsx`, `ChatComposer.tsx`, хуки `useChatRubberOverscroll.ts`, `useChatScroll.ts`, `useSeenMessageIds.ts`, `useChatVoiceInput.ts` (имена уточнить по факту разбиения).

**Задачи:**

- Заменить локальные дубликаты на импорты из Phase 2.
- Вынести резиновый overscroll, `ResizeObserver` высоты инпута, скролл к низу, сброс состояния при смене `chat.id` в хуки.
- Композиция: тонкий `ChatWindow` = header + transcript + composer; AI-bar и note/message режимы — часть composer или отдельные маленькие компоненты.

**Проверка паритета:** сравнение с `ChatWindow.pre-refactor.tsx` (ручной чеклист + при необходимости `diff` перенесённых кусков): отправка текста/заметок, вложения, голос (hold/lock если актуально), emoji, перехват AI, возврат агенту, скролл, смена чата.

**Зависимости:** Phase 2 (общие модули готовы и подключены сюда).

---

## Phase 4 — Рефакторинг `MobileInbox.tsx`

**Файлы:** `sales-front/components/mobile/MobileInbox.tsx`, при необходимости `mobile/MobileThreadList.tsx`, `mobile/MobileChatView.tsx` и т.п.

**Задачи:**

- Список тредов, переходы, `OrderDetailPanel`, safe-area — оставить в мобильном слое.
- Чат-транскрипт и композер: переиспользовать те же `MessageBubbleGroup` / `SystemMessageGroup` / хуки вложений и голоса, где нет принципиального расхождения; где отличия нужны (`VoicePreviewBar`, другой layout кнопок) — пропсы/slots, а не копипаста логики `groupMessages`.

**Проверка паритета:** сравнение с `MobileInbox.pre-refactor.tsx` (чеклист): список тредов, открытие чата, отправка, вложения, голос, AI-перехват, клавиатура/viewport. **Не** ожидать emoji и «Вернуть агенту» — в текущем API мобилки их нет.

**Зависимости:** Phase 2 и желательно Phase 3 (чтобы общие компоненты уже были «проверены» на desktop).

---

## Phase 5 — Уборка и жёсткая гигиена

**Файлы:** удалить или переместить:

- `ChatWindow.pre-refactor.tsx` и `MobileInbox.pre-refactor.tsx` — **после** подтверждения паритета (или оставить на один релиз в отдельной ветке — зафиксировать решение в PR).
- Удалить неиспользуемые импорты, мёртвый state/handlers, дубли.

**Проверка:** `npm run build`; TypeScript через Vite/IDE (отдельного скрипта `tsc` / ESLint в `package.json` нет). Ручной прогон desktop + mobile.

**Зависимости:** Phases 3–4 завершены, QA пройден.

---

## Риски и открытые решения

- **Визуал desktop vs mobile:** объединять только **логику**, классы Tailwind — через `variant`, иначе регресс верстки.
- **Семантика `groupMessages`:** две реализации слегка отличаются — перед слиянием явно сверить порядок групп на смешанных SYSTEM + bubble.
- **Голос:** desktop (hold/lock + возможно отдельный mic toggle) vs mobile (`VoicePreviewBar`) — общий хук отправки/upload, разный UI.

## Scope

- Только этот репозиторий (корень = корень `sales-front`).
- Без изменений backend API в этом плане.

## Validate-plan (сверка с текущим кодом)

**Репозиторий:** план в корне фронта: `plans/006-chat-inbox-refactor.md` (этот репозиторий).

**Точки входа (подтверждено):**

- `ChatWindow` — только `components/workspace/InboxView.tsx` (пропсы: `chat`, `companyId`, `toggleSidebar`, `isSidebarOpen`, `onSendMessage`, `onStopAssistant`, `isIntercepting`, `isReturningToAgent`, `onReturnToAgent`, `onOpenOrder`).
- `MobileInbox` — только `pages/InboxPage.tsx` при `isMobile` (пропсы: `threads`, `selectedChat`, загрузки, `onSelectChat`, `onSendMessage`, `onStopAssistant`, `isIntercepting`, `companyId`, фильтр тредов, `companyFields`). **`onReturnToAgent` / `isReturningToAgent` на мобилку не передаются** — кнопки «Вернуть агенту» в mobile сейчас нет; паритетный чеклист для Phase 4 не должен требовать её без отдельной продуктовой задачи.

**Различия desktop / mobile (не свести к одному UI без пропсов):**

- **Emoji:** есть в `ChatWindow` (`emoji-picker-react`), в `MobileInbox` **нет** — общий `ChatComposer` либо с опцией `showEmojiPicker`, либо emoji остаётся только в desktop-обёртке.
- **Голос:** mobile использует `VoicePreviewBar`; desktop — свой набор (`VoiceRecordingBar` / hold-to-talk и т.д. по факту кода). План про общий хук upload — ок; визуал раздельный.
- **Вложения:** у desktop `PendingAttachment` с `previewUrl?: string` для превью картинок; у mobile в типе `PendingAttachment` поля `previewUrl` в плане не зафиксированы — при общем хуке/типе оставить `previewUrl` опциональным.
- **`groupMessages`:** в `ChatWindow` сравнение ключа автора с **первым** сообщением в буфере пузырей; в `MobileInbox` — с **последним** (`bub[bub.length - 1]`). Это разная семантика группировки; Phase 2 обязана выбрать одну и прогнать граничные кейсы (подряд разные авторы одного типа).

**Сборка / типы:** в `sales-front/package.json` нет отдельного скрипта `tsc`; проверка — **`npm run build` (Vite)**. Файлы `*.pre-refactor.tsx` попадают под `tsconfig` `"include": ["**/*.tsx"]` и **будут проверяться компилятором** даже без импорта — снимок должен быть полной валидной копией (или добавить `exclude` для `*.pre-refactor.tsx`, если команда предпочтёт не дублировать проверку).

**Конфликтов имён с репозиторием нет:** вынесенные `MessageBubbleGroup.tsx` / `SystemMessageGroup.tsx` из Phase 2 — новые файлы; сейчас группы объявлены локально внутри `ChatWindow.tsx` и `MobileInbox.tsx`.

**Перекрытие фаз:** Phase 2 только добавляет модули; Phase 3 правит `ChatWindow.tsx`; Phase 4 — `MobileInbox.tsx`. Риск конфликта в одном файле между фазами низкий, кроме повторного редактирования общих `components/chat/*` при итеративных фиксах — держать Phase 2 стабильной до merge Phase 3.

**Сервисы/API:** `artifactsService.upload` / `uploadVoice` в `services/artifacts.ts` существуют; схема плана с ними совместима.

**Пути в фазах 1–4:** префикс `sales-front/` в таблицах — для читабельности извне; **в репозитории** указывать пути от корня (`components/...`, `plans/...`).

**Контракт Phase 2 → 3/4 (явно):** потребители ожидают экспорты: `groupMessages` + тип строки; `getBubbleStyleInfo` (или аналог) с `variant`; `getAuthorLabel`; `detectAttachmentType`; компоненты `MessageBubbleGroup` / `SystemMessageGroup` с согласованными пропами (`messages`, `companyId?`, `variant`, `newMessageIds` / `Set`). Любое переименование — до первого импорта в Phase 3.

**`.gitignore`:** каталог `plans/` **не** игнорируется — план коммитится вместе с репой.

---

## Рекомендуемая модель для выполнения

**Claude Sonnet 4.6** (или аналог среднего уровня): несколько десятков файлов в одном фронтенд-приложении, умеренно сложный рефакторинг с ручной проверкой паритета; не требуется Opus, если план выполняется фазами как выше. **Composer** возможен для узких подзадач внутри фазы (например, только вынести `detectAttachmentType`), но сквозное владение Phases 2–4 комфортнее модели с большим контекстом.
