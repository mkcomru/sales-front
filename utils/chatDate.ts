export function formatMessageClock(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function messageDayKey(dateInput?: string | null): string {
  if (!dateInput) return 'unknown';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatMessageDayLabel(dateInput?: string | null, now: Date = new Date()): string {
  if (!dateInput) return 'Недавно';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Недавно';

  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - 86400000);
  const day = startOfDay(date);

  if (isSameDay(day, today)) return 'Сегодня';
  if (isSameDay(day, yesterday)) return 'Вчера';

  const sameYear = day.getFullYear() === today.getFullYear();
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
