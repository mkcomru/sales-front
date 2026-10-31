import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Save, XCircle } from 'lucide-react';
import { tasksService, companiesService } from '../services';
import type { TaskResponse, UpdateTaskRequest } from '../types/api';
import type { CompanyMember } from '../types';
import { useToast } from '../hooks/useToast';
import { logger } from '../utils/logger';
import { isAgentScheduledFollowUpTask, isStageRuleAutoPingTask } from '../utils/taskUtils';
import { FormCheckbox } from '../components/FormCheckbox';

export const OrderTaskPage: React.FC = () => {
  const { companyId: companyIdParam, orderId: orderIdParam, taskId: taskIdParam } = useParams<{
    companyId: string;
    orderId: string;
    taskId: string;
  }>();
  const navigate = useNavigate();
  const toast = useToast();

  const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;
  const orderId = orderIdParam ? parseInt(orderIdParam, 10) : null;
  const taskId = taskIdParam ? parseInt(taskIdParam, 10) : null;

  const [task, setTask] = useState<TaskResponse | null>(null);
  const [managers, setManagers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTechnicalFields, setShowTechnicalFields] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editAssignee, setEditAssignee] = useState('');

  const load = useCallback(async () => {
    if (!companyId || !orderId || !taskId) return;
    setLoading(true);
    try {
      const [t, membersRes] = await Promise.all([
        tasksService.getById(companyId, orderId, taskId),
        companiesService.listMembers(companyId),
      ]);
      setTask(t);
      setEditTitle(t.title);
      setEditDescription(t.description ?? '');
      setEditDue(t.due_date ? t.due_date.slice(0, 10) : '');
      setEditAssignee(t.assignee_id != null ? String(t.assignee_id) : '');
      const items = Array.isArray(membersRes) ? membersRes : (membersRes.items ?? []);
      setManagers(items);
    } catch (e) {
      logger.error('order_task.load_failed', e);
      toast.error('Не удалось загрузить задачу');
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, orderId, taskId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const isActive = task && !task.completed && !task.cancelled_at;

  const handleSaveEdits = async () => {
    if (!companyId || !orderId || !taskId || !task || !isActive) return;
    if (!editTitle.trim() || !editDue) {
      toast.error('Укажите название и срок');
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateTaskRequest = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        due_date: new Date(editDue).toISOString(),
        assignee_id: editAssignee ? parseInt(editAssignee, 10) : undefined,
      };
      const updated = await tasksService.update(companyId, orderId, taskId, payload);
      setTask(updated);
      toast.success('Сохранено');
    } catch (e) {
      logger.error('order_task.save_failed', e);
      toast.error('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!companyId || !orderId || !taskId) return;
    try {
      await tasksService.complete(companyId, orderId, taskId);
      toast.success('Задача выполнена');
      await load();
    } catch (e) {
      logger.error('order_task.complete_failed', e);
      toast.error('Не удалось выполнить');
    }
  };

  const handleCancelTask = async () => {
    if (!companyId || !orderId || !taskId) return;
    try {
      await tasksService.cancel(companyId, orderId, taskId);
      toast.success('Задача отменена');
      await load();
    } catch (e) {
      logger.error('order_task.cancel_failed', e);
      toast.error('Не удалось отменить');
    }
  };

  if (!companyId || !orderId || !taskId) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">Некорректная ссылка</div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">Задача не найдена</div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex h-[56px] flex-shrink-0 items-center gap-3 border-b border-gray-100 px-6">
        <button
          type="button"
          onClick={() =>
            companyId && orderId
              ? navigate(`/${companyId}/orders/${orderId}/tasks`)
              : navigate(-1)
          }
          className="flex items-center gap-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          title="К списку задач"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold text-gray-900">Задача</h1>
        {isActive && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleComplete}
              className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-700"
              title="Выполнить"
            >
              <CheckCircle size={18} />
            </button>
            <button
              type="button"
              onClick={handleCancelTask}
              className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
              title="Отменить"
            >
              <XCircle size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-medium text-gray-400">Заказ #{task.order_id}</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-600">
                {task.type}
              </span>
              {isStageRuleAutoPingTask(task) && (
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                  стадия
                </span>
              )}
              {isAgentScheduledFollowUpTask(task) && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900">
                  от AI
                </span>
              )}
            </div>
            {task.completed && (
              <p className="text-[12px] font-medium text-green-700">Выполнена</p>
            )}
            {task.cancelled_at && !task.completed && (
              <p className="text-[12px] font-medium text-gray-600">Отменена</p>
            )}
          </div>

          {isActive ? (
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Название
              </label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-[14px]"
              />
              <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Описание
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-[14px]"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    Срок
                  </label>
                  <input
                    type="date"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-[14px]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    Ответственный
                  </label>
                  <select
                    value={editAssignee}
                    onChange={(e) => setEditAssignee(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-[14px]"
                  >
                    <option value="">—</option>
                    {managers.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEdits}
                  className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-2xl border border-gray-200 bg-neutral-50/80 p-4">
              <p className="text-[15px] font-semibold text-gray-900">{task.title}</p>
              {task.description && (
                <p className="whitespace-pre-wrap text-[13px] text-gray-600">{task.description}</p>
              )}
              <p className="text-[12px] text-gray-500">
                Срок: {new Date(task.due_date).toLocaleString()}
              </p>
            </div>
          )}

          <FormCheckbox
            className="text-[13px]"
            checked={showTechnicalFields}
            onChange={setShowTechnicalFields}
          >
            Показать служебные поля
          </FormCheckbox>

          {showTechnicalFields && (
            <dl className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-[12px]">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">ID</dt>
                <dd className="font-mono text-gray-900">{task.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">company_id</dt>
                <dd className="font-mono text-gray-900">{task.company_id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">assignee_id</dt>
                <dd className="font-mono text-gray-900">{task.assignee_id ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">ping_rule_id</dt>
                <dd className="font-mono text-gray-900">{task.ping_rule_id ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">auto_action</dt>
                <dd className="break-all text-gray-900">{task.auto_action ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">attempt_count</dt>
                <dd className="text-gray-900">{task.attempt_count}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">failure_reason</dt>
                <dd className="break-all text-gray-900">{task.failure_reason ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">completed_at</dt>
                <dd className="text-gray-900">{task.completed_at ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">cancelled_at</dt>
                <dd className="text-gray-900">{task.cancelled_at ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">created_at</dt>
                <dd className="text-gray-900">{task.created_at}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">created_by_id</dt>
                <dd className="text-gray-900">{task.created_by_id ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">completed_by_type</dt>
                <dd className="text-gray-900">{task.completed_by_type ?? '—'}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
};
