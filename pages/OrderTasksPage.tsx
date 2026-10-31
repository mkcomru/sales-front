import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, Loader2, Plus, Save } from 'lucide-react';
import { tasksService, companiesService } from '../services';
import type { TaskResponse, CreateOrderTaskRequest } from '../types/api';
import type { CompanyMember } from '../types';
import { FormCheckbox } from '../components/FormCheckbox';
import { useToast } from '../hooks/useToast';
import { isAgentScheduledFollowUpTask, isStageRuleAutoPingTask } from '../utils/taskUtils';
import { logger } from '../utils/logger';

function isTaskActive(t: TaskResponse): boolean {
  return !t.completed && !t.cancelled_at;
}

export const OrderTasksPage: React.FC = () => {
  const { companyId: cid, orderId: oid } = useParams<{ companyId: string; orderId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const companyId = cid ? parseInt(cid, 10) : null;
  const orderId = oid ? parseInt(oid, 10) : null;

  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [managers, setManagers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showStageRuleAutoPings, setShowStageRuleAutoPings] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    companiesService
      .listMembers(companyId)
      .then((raw: CompanyMember[] | { items?: CompanyMember[] }) => {
        if (cancelled) return;
        const items = Array.isArray(raw) ? raw : (raw.items ?? []);
        setManagers(items);
      })
      .catch(() => {
        if (!cancelled) setManagers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const loadTasks = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!companyId || !orderId) return;
      if (!opts?.silent) setLoading(true);
      try {
        const data = await tasksService.listForOrder(companyId, orderId, {
          includeCompleted: true,
        });
        setTasks(data);
      } catch (e) {
        logger.error('Failed to load order tasks', e);
        toast.error('Не удалось загрузить задачи');
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [companyId, orderId, toast]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const visibleTasks = useMemo(() => {
    let next = tasks;
    if (!showStageRuleAutoPings) {
      next = next.filter((t) => !isStageRuleAutoPingTask(t));
    }
    if (!showCompletedTasks) {
      next = next.filter(isTaskActive);
    }
    return next;
  }, [tasks, showStageRuleAutoPings, showCompletedTasks]);

  const hiddenStagePingCount = useMemo(
    () => tasks.filter((t) => isStageRuleAutoPingTask(t)).length,
    [tasks]
  );

  const activeCount = useMemo(() => tasks.filter(isTaskActive).length, [tasks]);

  const handleCreate = async (data: CreateOrderTaskRequest) => {
    if (!companyId || !orderId) return;
    try {
      await tasksService.create(companyId, orderId, data);
      setShowForm(false);
      await loadTasks({ silent: true });
      toast.success('Задача создана');
    } catch (e) {
      logger.error('Failed to create order task', e);
      toast.error('Ошибка при создании');
    }
  };

  const openTask = (taskId: number) => {
    if (!companyId || !orderId) return;
    navigate(`/${companyId}/orders/${orderId}/tasks/${taskId}`);
  };

  if (!companyId || !orderId) {
    return <div className="p-8 text-center text-sm text-gray-500">Некорректная ссылка</div>;
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex h-[56px] flex-shrink-0 items-center gap-3 border-b border-gray-100 px-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          title="Назад"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-[15px] font-bold text-gray-900">
          Заказ #{orderId} · Задачи
        </h1>
        <span className="rounded-md bg-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-600">
          активных: {activeCount}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        <div className="flex flex-wrap items-center gap-4">
          <FormCheckbox
            className="text-[12px]"
            checked={showCompletedTasks}
            onChange={setShowCompletedTasks}
            title="Показать в списке выполненные и отменённые (без перезагрузки страницы)."
          >
            Показать выполненные
          </FormCheckbox>
          <FormCheckbox
            className="text-[12px]"
            checked={showStageRuleAutoPings}
            onChange={setShowStageRuleAutoPings}
            title="Показать задачи авто-пинга по правилам стадии (без перезагрузки страницы)."
          >
            Показать авто-пинги стадий
          </FormCheckbox>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-indigo-600 hover:bg-indigo-50"
            >
              <Plus size={14} /> Задача
            </button>
          )}
        </div>

        {showForm && (
          <CreateTaskForm
            managers={managers}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        )}

        {tasks.length > 0 && visibleTasks.length === 0 && !showForm && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            По текущим фильтрам список пуст.
            {!showStageRuleAutoPings && hiddenStagePingCount > 0 && (
              <span> Скрыто авто-пингов стадии: {hiddenStagePingCount}.</span>
            )}
            {!showCompletedTasks && tasks.some((t) => !isTaskActive(t)) && (
              <span> Включите «Показать выполненные», чтобы увидеть завершённые и отменённые.</span>
            )}
          </div>
        )}

        {tasks.length === 0 && !showForm && (
          <p className="text-sm text-gray-400">Нет задач</p>
        )}

        <ul className="space-y-2">
          {visibleTasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => openTask(task.id)}
                className={`w-full rounded-lg border p-3 text-left text-[13px] transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 ${
                  task.completed
                    ? 'border-green-100 bg-green-50/40'
                    : task.cancelled_at
                      ? 'border-gray-100 bg-gray-50 opacity-70'
                      : task.is_overdue
                        ? 'border-red-100 bg-red-50/40'
                        : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-medium ${
                      task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.is_overdue && isTaskActive(task) && (
                    <AlertTriangle size={12} className="text-red-500" />
                  )}
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
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
                {task.description && (
                  <p className="mt-1 truncate text-[12px] text-gray-500">{task.description}</p>
                )}
                <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock size={10} />
                  {new Date(task.due_date).toLocaleString()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const CreateTaskForm: React.FC<{
  managers: CompanyMember[];
  onSubmit: (data: CreateOrderTaskRequest) => void;
  onCancel: () => void;
}> = ({ managers, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !dueDate) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      type: 'manual',
      due_date: new Date(dueDate).toISOString(),
      assignee_id: assigneeId ? parseInt(assigneeId, 10) : undefined,
    });
  };

  return (
    <div className="space-y-2 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4">
      <input
        placeholder="Название *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-[13px]"
      />
      <input
        placeholder="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-[13px]"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-lg border px-3 py-2 text-[13px]"
        />
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-[13px]"
        >
          <option value="">Ответственный</option>
          {managers.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {m.first_name} {m.last_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[12px] text-gray-500 hover:bg-gray-100"
        >
          Отмена
        </button>
        <button
          type="button"
          disabled={!title.trim() || !dueDate}
          onClick={handleSubmit}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
        >
          <Save size={12} /> Создать
        </button>
      </div>
    </div>
  );
};
