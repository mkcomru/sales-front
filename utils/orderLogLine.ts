import type { AssigneeInfo, OrderLogEntry } from '../types/api';

export interface OrderLogFormatContext {
  stageLabel: (stageId: number | null | undefined) => string;
  assigneeLabel: (companyUserId: number | null | undefined) => string;
}

function str(v: unknown): string {
  if (v === null || v === undefined) {
    return '';
  }
  if (typeof v === 'string') {
    return v;
  }
  return String(v);
}

function formatFieldValue(v: unknown): string {
  if (v === null || v === undefined) {
    return 'пусто';
  }
  if (typeof v === 'object') {
    return JSON.stringify(v);
  }
  return String(v);
}

export function formatOrderLogAuthor(author: AssigneeInfo | null): string | null {
  if (!author) {
    return null;
  }
  const name = [author.first_name, author.last_name].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
  }
  if (author.email) {
    return author.email;
  }
  return `Пользователь #${author.id}`;
}

export function formatOrderLogLine(log: OrderLogEntry, ctx: OrderLogFormatContext): string {
  const { type, data } = log;

  switch (type) {
    case 'order_created': {
      const parts: string[] = ['Заказ создан'];
      if (typeof data.order_number === 'number') {
        parts.push(`№${data.order_number}`);
      }
      const channel = data.initial_channel;
      if (channel != null && str(channel) !== '') {
        parts.push(`канал: ${str(channel)}`);
      }
      if (typeof data.assignee_id === 'number') {
        parts.push(`ответственный: ${ctx.assigneeLabel(data.assignee_id)}`);
      }
      return parts.join(' · ');
    }
    case 'stage_change': {
      if (data.result === 'won') {
        return 'Заказ закрыт: выиграно';
      }
      if (data.result === 'lost') {
        return 'Заказ закрыт: проиграно';
      }
      const from = ctx.stageLabel(data.from_stage_id as number | null | undefined);
      const to = ctx.stageLabel(data.to_stage_id as number | null | undefined);
      const triggerRaw = data.trigger;
      const triggerLabel =
        triggerRaw === 'manual'
          ? 'вручную'
          : triggerRaw === 'auto'
            ? 'автоматически'
            : triggerRaw === 'system'
              ? 'система'
              : str(triggerRaw);
      return `Этап: ${from} → ${to}${triggerLabel ? ` (${triggerLabel})` : ''}`;
    }
    case 'assignee_change': {
      const from = ctx.assigneeLabel(data.from_user_id as number | null | undefined);
      const to = ctx.assigneeLabel(data.to_user_id as number | null | undefined);
      return `Ответственный: ${from} → ${to}`;
    }
    case 'field_change': {
      const field = str(data.field) || 'поле';
      const oldV = formatFieldValue(data.old);
      const newV = formatFieldValue(data.new);
      const level = data.level === 'order' ? 'заказ' : str(data.level) || 'заказ';
      return `Поле (${level}): «${field}» — ${oldV} → ${newV}`;
    }
    case 'comment': {
      return str(data.text) || 'Комментарий';
    }
    case 'task_created': {
      const title = str(data.title);
      return title ? `Задача создана: ${title}` : 'Задача создана';
    }
    case 'task_completed': {
      if (data.completed_by_type === 'user') {
        return 'Задача выполнена (пользователем)';
      }
      const by = str(data.completed_by_type);
      return by ? `Задача выполнена (${by})` : 'Задача выполнена';
    }
    default: {
      const keys = Object.keys(data);
      return keys.length ? `${type}: ${JSON.stringify(data)}` : type;
    }
  }
}
