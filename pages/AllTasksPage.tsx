import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Users,
} from 'lucide-react';
import { tasksService, companiesService } from '../services';
import type { TaskResponse } from '../types/api';
import type { CompanyMember } from '../types';
import { useToast } from '../hooks/useToast';
import { isAgentScheduledFollowUpTask, isStageRuleAutoPingTask } from '../utils/taskUtils';
import { FormCheckbox } from '../components/FormCheckbox';
import { logger } from '../utils/logger';

export const AllTasksPage: React.FC = () => {
  const { companyId: companyIdParam } = useParams<{ companyId: string }>();
  const companyId = companyIdParam ? parseInt(companyIdParam, 10) : null;
  const toast = useToast();

  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [managers, setManagers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStageRuleAutoPings, setShowStageRuleAutoPings] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  const visibleTasks = useMemo(() => {
    if (showStageRuleAutoPings) return tasks;
    return tasks.filter((t) => !isStageRuleAutoPingTask(t));
  }, [tasks, showStageRuleAutoPings]);

  const hiddenStagePingCount = useMemo(
    () => tasks.filter((t) => isStageRuleAutoPingTask(t)).length,
    [tasks]
  );

  const fetchTasks = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const data = await tasksService.allCompanyTasks(companyId, {
        includeCompleted: showCompletedTasks,
      });
      setTasks(data);
    } catch (error) {
      logger.error('Failed to fetch all company tasks', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, showCompletedTasks]);

  const fetchManagers = useCallback(async () => {
    if (!companyId) return;
    try {
      const response = await companiesService.listMembers(companyId);
      const items = Array.isArray(response) ? response : (response.items || []);
      setManagers(items);
    } catch (error) {
      logger.error('Failed to fetch managers', error);
    }
  }, [companyId]);

  useEffect(() => {
    fetchTasks();
    fetchManagers();
  }, [fetchTasks, fetchManagers]);

  const handleComplete = async (task: TaskResponse) => {
    if (!companyId) return;
    try {
      await tasksService.complete(companyId, task.order_id, task.id);
      fetchTasks();
      toast.success('Задача выполнена');
    } catch (error) {
      logger.error('Failed to complete task', error);
      toast.error('Ошибка при выполнении задачи');
    }
  };

  const getManagerName = (assigneeId: number | null): string => {
    if (!assigneeId) return 'Не назначено';
    const manager = managers.find(m => m.id === String(assigneeId) || m.id === assigneeId);
    if (manager) {
      return `${manager.first_name || ''} ${manager.last_name || ''}`.trim() || 'Неизвестно';
    }
    return 'Неизвестно';
  };

  const tasksByAssignee = useMemo(() => {
    const grouped: Record<string | number, TaskResponse[]> = {};
    visibleTasks.forEach(task => {
      const key = task.assignee_id ?? 'unassigned';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(task);
    });
    return grouped;
  }, [visibleTasks]);

  const categorizeTasks = (taskList: TaskResponse[]): {
    overdue: TaskResponse[];
    today: TaskResponse[];
    upcoming: TaskResponse[];
    completed: TaskResponse[];
  } => {
    const overdue = taskList.filter(t => t.is_overdue && !t.completed && !t.cancelled_at);
    const today = taskList.filter(t => {
      if (t.completed || t.cancelled_at || t.is_overdue) return false;
      const due = new Date(t.due_date);
      const now = new Date();
      return due.toDateString() === now.toDateString();
    });
    const upcoming = taskList.filter(t => {
      if (t.completed || t.cancelled_at || t.is_overdue) return false;
      const due = new Date(t.due_date);
      const now = new Date();
      return due > now && due.toDateString() !== now.toDateString();
    });
    const completed = taskList.filter(t => t.completed || !!t.cancelled_at);
    return { overdue, today, upcoming, completed };
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  const assigneeKeys = Object.keys(tasksByAssignee).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return getManagerName(a === 'unassigned' ? null : Number(a)).localeCompare(
      getManagerName(b === 'unassigned' ? null : Number(b))
    );
  });

  return (
    <div className="flex h-full w-full bg-white flex-col overflow-hidden">
      <div className="h-[64px] px-8 flex items-center border-b border-gray-100 flex-shrink-0 gap-6">
        <div className="flex items-center gap-3 min-w-0">
          <Users size={18} className="text-gray-400 flex-shrink-0" />
          <h2 className="text-[15px] font-bold text-gray-900">Задачи</h2>
          <span className="bg-gray-200 text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0">
            {visibleTasks.filter(t => !t.completed && !t.cancelled_at).length}
          </span>
        </div>
        <div className="flex items-center gap-4 ml-auto flex-wrap justify-end">
          <FormCheckbox
            className="gap-2 text-[12px]"
            checked={showCompletedTasks}
            onChange={setShowCompletedTasks}
            title="По умолчанию API отдаёт только активные задачи. Включите, чтобы подгружать выполненные и отменённые."
          >
            Показать выполненные
          </FormCheckbox>
          <FormCheckbox
            className="gap-2 text-[12px]"
            checked={showStageRuleAutoPings}
            onChange={setShowStageRuleAutoPings}
            title="Напоминания от AI-ассистента всегда в списке; скрыты только авто-пинги по правилам стадии."
          >
            Показать авто-пинги стадий
          </FormCheckbox>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
        {tasks.length > 0 && visibleTasks.length === 0 && (
          <div className="text-center py-10 text-amber-800/90 bg-amber-50 border border-amber-100 rounded-xl max-w-md mx-auto px-4">
            <p className="text-sm">
              Включите «Показать авто-пинги стадий» — скрыто {hiddenStagePingCount}{' '}
              {hiddenStagePingCount === 1 ? 'такая задача' : 'таких задач'} по правилам стадии. Напоминания,
              запланированные AI-ассистентом, не скрываются.
            </p>
          </div>
        )}

        {assigneeKeys.length === 0 && tasks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Нет задач</p>
          </div>
        )}

        {assigneeKeys.map(assigneeKey => {
          const assigneeTasks = tasksByAssignee[assigneeKey];
          const assigneeId = assigneeKey === 'unassigned' ? null : Number(assigneeKey);
          const assigneeName = getManagerName(assigneeId);
          const { overdue, today, upcoming, completed } = categorizeTasks(assigneeTasks);

          return (
            <div key={assigneeKey} className="border-b border-gray-100 pb-8 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-gray-400" />
                <h3 className="text-[14px] font-bold text-gray-900">{assigneeName}</h3>
                <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                  {assigneeTasks.filter(t => !t.completed && !t.cancelled_at).length} активных
                </span>
              </div>

              <div className="space-y-6 ml-6">
                {overdue.length > 0 && (
                  <TaskGroup
                    title="Просрочено"
                    icon={<AlertTriangle size={14} className="text-red-500" />}
                    tasks={overdue}
                    onComplete={handleComplete}
                  />
                )}

                {today.length > 0 && (
                  <TaskGroup
                    title="Сегодня"
                    icon={<Clock size={14} className="text-amber-500" />}
                    tasks={today}
                    onComplete={handleComplete}
                  />
                )}

                {upcoming.length > 0 && (
                  <TaskGroup
                    title="Предстоящие"
                    icon={<Clock size={14} className="text-blue-500" />}
                    tasks={upcoming}
                    onComplete={handleComplete}
                  />
                )}

                {completed.length > 0 && (
                  <TaskGroup
                    title="Завершённые"
                    icon={<CheckCircle size={14} className="text-green-500" />}
                    tasks={completed}
                    onComplete={handleComplete}
                    dimmed
                  />
                )}

                {assigneeTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Нет задач
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TaskGroup: React.FC<{
  title: string;
  icon: React.ReactNode;
  tasks: TaskResponse[];
  onComplete: (task: TaskResponse) => void;
  dimmed?: boolean;
}> = ({ title, icon, tasks, onComplete, dimmed }) => (
  <div className={dimmed ? 'opacity-60' : ''}>
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-[13px] font-bold text-gray-700">{title}</h3>
      <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{tasks.length}</span>
    </div>
    <div className="space-y-2">
      {tasks.map(task => (
        <div key={task.id} className={`p-3 border rounded-lg text-[13px] ${
          task.is_overdue && !task.completed ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.title}
                </span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-medium">
                  {task.type}
                </span>
                {isStageRuleAutoPingTask(task) && (
                  <span className="text-[10px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded font-medium">
                    стадия
                  </span>
                )}
                {isAgentScheduledFollowUpTask(task) && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-medium">
                    от AI
                  </span>
                )}
              </div>
              {task.description && (
                <div className="text-gray-500 text-[12px] mt-0.5 truncate">{task.description}</div>
              )}
              <div className="text-[10px] text-gray-400 mt-1">
                Срок: {new Date(task.due_date).toLocaleDateString()} · Заказ #{task.order_id}
              </div>
            </div>
            {!task.completed && !task.cancelled_at && (
              <button
                onClick={() => onComplete(task)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
                title="Выполнить"
              >
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);
