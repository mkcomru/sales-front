import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Clock, Plus, X, Edit2 } from 'lucide-react';
import { companiesService, scheduleService } from '../services';
import type { CompanyMember, CompanyUserSchedule, WorkSchedule, WeeklySchedule } from '../types/api';
import { useToast } from '../hooks/useToast';
import { extractApiErrorMessage } from '../utils/errors';

interface TeamScheduleProps {
  companyId: number;
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface DayEditorState {
  enabled: boolean;
  start: string;
  end: string;
}

type WeekEditorState = Record<DayKey, DayEditorState>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Пн' },
  { key: 'tue', label: 'Вт' },
  { key: 'wed', label: 'Ср' },
  { key: 'thu', label: 'Чт' },
  { key: 'fri', label: 'Пт' },
  { key: 'sat', label: 'Сб' },
  { key: 'sun', label: 'Вс' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
  { value: 'Europe/London', label: 'Лондон (UTC±0/+1)' },
  { value: 'Europe/Berlin', label: 'Берлин/Париж (UTC+1/+2)' },
  { value: 'Europe/Kiev', label: 'Киев (UTC+2/+3)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
];

const DEFAULT_DAY: DayEditorState = { enabled: false, start: '09:00', end: '18:00' };

const DEFAULT_WEEK: WeekEditorState = {
  mon: { ...DEFAULT_DAY },
  tue: { ...DEFAULT_DAY },
  wed: { ...DEFAULT_DAY },
  thu: { ...DEFAULT_DAY },
  fri: { ...DEFAULT_DAY },
  sat: { ...DEFAULT_DAY },
  sun: { ...DEFAULT_DAY },
};

function scheduleToEditorState(ws: WorkSchedule): { timezone: string; week: WeekEditorState } {
  const week = { ...DEFAULT_WEEK } as WeekEditorState;
  for (const { key } of DAYS) {
    const slots = ws.weekly[key];
    week[key] = slots.length > 0
      ? { enabled: true, start: slots[0].start, end: slots[0].end }
      : { ...DEFAULT_DAY };
  }
  return { timezone: ws.timezone, week };
}

function editorStateToSchedule(timezone: string, week: WeekEditorState): WorkSchedule {
  const weekly = {} as WeeklySchedule;
  for (const { key } of DAYS) {
    const day = week[key];
    weekly[key] = day.enabled ? [{ start: day.start, end: day.end }] : [];
  }
  return { version: 1, timezone, weekly };
}

const ROLES = [
  { value: 'viewer', label: 'Просмотр' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'admin', label: 'Админ' },
] as const;

export const TeamSchedule: React.FC<TeamScheduleProps> = ({ companyId }) => {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'manager' as string,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await companiesService.listMembers(companyId);
      const items = Array.isArray(response) ? response : (response.items || []);
      setMembers(items);
    } catch (error) {
      toast.error(`Ошибка загрузки команды: ${extractApiErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleToggleAvailability = async (member: CompanyMember) => {
    try {
      await scheduleService.updateCompanyUser(member.id, {
        is_available: !member.is_available,
      });
      setMembers(prev =>
        prev.map(m => m.id === member.id ? { ...m, is_available: !m.is_available } : m)
      );
      toast.success(`${member.first_name}: ${!member.is_available ? 'Доступен' : 'Недоступен'}`);
    } catch (error) {
      toast.error('Ошибка при изменении доступности');
    }
  };

  const resetForm = useCallback(() => {
    setFormData({ first_name: '', last_name: '', email: '', password: '', role: 'manager' });
    setIsFormOpen(false);
  }, []);

  const handleAddMember = async () => {
    const { first_name, last_name, email, password, role } = formData;
    if (!first_name.trim() || !last_name.trim() || !email.trim() || !password) {
      toast.error('Заполните все поля');
      return;
    }
    if (password.length < 8) {
      toast.error('Пароль не менее 8 символов');
      return;
    }

    try {
      setIsSubmitting(true);
      const added = await companiesService.addMember(companyId, {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        password,
        role,
      });
      setMembers(prev => [...prev, { ...added, is_available: true }]);
      resetForm();
      toast.success('Участник добавлен');
    } catch (error) {
      toast.error(`Ошибка: ${extractApiErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[14px] font-bold text-gray-900">Команда и расписание</h3>

      {isFormOpen ? (
        <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-[14px] font-bold text-gray-900">Новый участник</h4>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label">Имя</label>
                <input
                  value={formData.first_name}
                  onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Иван"
                  className="form-input"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">Фамилия</label>
                <input
                  value={formData.last_name}
                  onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Петров"
                  className="form-input"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                className="form-input"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label">Пароль</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Минимум 8 символов"
                className="form-input"
              />
            </div>

            <div className="space-y-1">
              <label className="form-label">Роль</label>
              <select
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="form-select"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={resetForm}
              className="btn-ghost"
            >
              Отмена
            </button>
            <button
              onClick={handleAddMember}
              disabled={isSubmitting}
              className="btn-accent"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Добавить
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full py-3 px-4 border border-dashed border-indigo-200 rounded-xl text-[13px] font-medium text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Добавить участника
        </button>
      )}

      <div className="space-y-2">
        {members.map(member => (
          <MemberScheduleCard
            key={member.id}
            member={member}
            onToggleAvailability={() => handleToggleAvailability(member)}
          />
        ))}
        {members.length === 0 && !isFormOpen && (
          <div className="text-[13px] text-gray-400 italic py-4 text-center">Нет участников</div>
        )}
      </div>
    </div>
  );
};

const MemberScheduleCard: React.FC<{
  member: CompanyMember;
  onToggleAvailability: () => void;
}> = ({ member, onToggleAvailability }) => {
  const [schedule, setSchedule] = useState<CompanyUserSchedule | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoadingSchedule(true);
      const data = await scheduleService.getSchedule(member.id);
      setSchedule(data);
    } catch {
      // no schedule configured yet
    } finally {
      setLoadingSchedule(false);
    }
  }, [member.id]);

  useEffect(() => {
    if (expanded && !schedule) {
      fetchSchedule();
    }
  }, [expanded, schedule, fetchSchedule]);

  const handleScheduleSaved = useCallback((updated: CompanyUserSchedule) => {
    setSchedule(updated);
    setEditing(false);
  }, []);

  return (
    <div className="border rounded-lg bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            member.is_available ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[13px] text-gray-900">
                {member.first_name} {member.last_name}
              </span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium uppercase">
                {member.role}
              </span>
            </div>
            <div className="text-[11px] text-gray-400">{member.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAvailability}
            className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              member.is_available
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {member.is_available ? 'Доступен' : 'Недоступен'}
          </button>
          <button
            onClick={() => {
              setExpanded(v => !v);
              if (expanded) setEditing(false);
            }}
            className={`p-1 rounded transition-colors ${
              expanded ? 'text-indigo-500 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Clock size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2">
          {loadingSchedule && (
            <div className="flex items-center gap-2 text-[12px] text-gray-400 py-2">
              <Loader2 size={12} className="animate-spin" />
              Загрузка...
            </div>
          )}

          {!loadingSchedule && !editing && (
            <ScheduleView
              schedule={schedule}
              onEdit={() => setEditing(true)}
            />
          )}

          {!loadingSchedule && editing && (
            <ScheduleEditor
              companyUserId={member.id}
              schedule={schedule}
              onSaved={handleScheduleSaved}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

const ScheduleView: React.FC<{
  schedule: CompanyUserSchedule | null;
  onEdit: () => void;
}> = ({ schedule, onEdit }) => {
  if (!schedule?.work_schedule) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-[12px] text-gray-400 italic">Расписание не настроено</span>
        <button
          onClick={onEdit}
          className="text-[12px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          <Edit2 size={12} />
          Настроить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {schedule.schedule_description && (
            <div className="text-[12px] text-gray-600">{schedule.schedule_description}</div>
          )}
          <div className="flex items-center gap-2 text-[11px]">
            <span className={schedule.is_working_now ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {schedule.is_working_now ? '● Сейчас работает' : '○ Не в рабочее время'}
            </span>
            {schedule.next_available_at_local && !schedule.is_working_now && (
              <span className="text-gray-400">
                · доступен: {schedule.next_available_at_local}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-400">
            Часовой пояс: {schedule.work_schedule.timezone}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-[12px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 ml-2 flex-shrink-0"
        >
          <Edit2 size={12} />
          Изменить
        </button>
      </div>

      <div className="flex gap-1 pt-0.5">
        {DAYS.map(({ key, label }) => {
          const slots = schedule.work_schedule!.weekly[key];
          const active = slots.length > 0;
          return (
            <div
              key={key}
              title={active ? `${slots[0].start}–${slots[0].end}` : 'Выходной'}
              className={`flex flex-col items-center px-1.5 py-1 rounded text-[10px] font-medium ${
                active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {label}
              {active && (
                <span className="text-[9px] font-normal leading-tight">
                  {slots[0].start.replace(':00', '')}–{slots[0].end.replace(':00', '')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ScheduleEditor: React.FC<{
  companyUserId: number;
  schedule: CompanyUserSchedule | null;
  onSaved: (updated: CompanyUserSchedule) => void;
  onCancel: () => void;
}> = ({ companyUserId, schedule, onSaved, onCancel }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [timezone, setTimezone] = useState<string>(() =>
    schedule?.work_schedule?.timezone ?? 'Europe/Moscow'
  );
  const [week, setWeek] = useState<WeekEditorState>(() =>
    schedule?.work_schedule ? scheduleToEditorState(schedule.work_schedule).week : { ...DEFAULT_WEEK }
  );

  const setDay = useCallback((key: DayKey, patch: Partial<DayEditorState>) => {
    setWeek(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const handleSave = async () => {
    for (const { key, label } of DAYS) {
      const day = week[key];
      if (!day.enabled) continue;
      const [sh, sm] = day.start.split(':').map(Number);
      const [eh, em] = day.end.split(':').map(Number);
      if (sh * 60 + sm >= eh * 60 + em) {
        toast.error(`${label}: начало должно быть раньше конца`);
        return;
      }
    }

    try {
      setSaving(true);
      const workSchedule = editorStateToSchedule(timezone, week);
      await scheduleService.updateCompanyUser(companyUserId, { work_schedule: workSchedule });
      const updated = await scheduleService.getSchedule(companyUserId);
      onSaved(updated);
      toast.success('Расписание сохранено');
    } catch (error) {
      toast.error(`Ошибка: ${extractApiErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-1">
        <label className="form-label">Часовой пояс</label>
        <select
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          className="form-select"
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="form-label">Рабочее время</label>
        <div className="space-y-1.5">
          {DAYS.map(({ key, label }) => {
            const day = week[key];
            return (
              <div key={key} className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors ${
                day.enabled ? 'bg-indigo-50/60' : 'bg-gray-50'
              }`}>
                <button
                  onClick={() => setDay(key, { enabled: !day.enabled })}
                  className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${
                    day.enabled ? 'bg-indigo-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                    day.enabled ? 'left-[18px]' : 'left-0.5'
                  }`} />
                </button>
                <span className={`text-[12px] font-medium w-5 flex-shrink-0 ${
                  day.enabled ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {label}
                </span>
                {day.enabled ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="time"
                      value={day.start}
                      onChange={e => setDay(key, { start: e.target.value })}
                      className="border border-gray-200 rounded px-1.5 py-0.5 text-[12px] bg-white outline-none focus:ring-1 focus:ring-indigo-200 w-[72px]"
                    />
                    <span className="text-[11px] text-gray-400">—</span>
                    <input
                      type="time"
                      value={day.end}
                      onChange={e => setDay(key, { end: e.target.value })}
                      className="border border-gray-200 rounded px-1.5 py-0.5 text-[12px] bg-white outline-none focus:ring-1 focus:ring-indigo-200 w-[72px]"
                    />
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">выходной</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="btn-ghost btn-sm"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-accent btn-sm"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : null}
          Сохранить
        </button>
      </div>
    </div>
  );
};
