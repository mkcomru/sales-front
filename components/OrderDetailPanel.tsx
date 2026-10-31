import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Loader2,
  Lock,
  Unlock,
  XCircle,
  CheckCircle,
  Send,
  Clock,
  FileText,
  Target,
  MessageSquare,
} from 'lucide-react';
import { ordersService } from '../services';
import { FieldInput } from './FieldInput';
import { OrderTasksTeaser } from './OrderTasksTeaser';
import { StageProgressSection } from './StageProgressSection';
import { CustomerFieldsEditor, QualificationFormFields } from './customer';
import type { OrderResponse, OrderLogEntry, StageTemplate } from '../types/api';
import type { CompanyField, CompanyMember } from '../types';
import { useToast } from '../hooks/useToast';
import { useRealtimeEvent } from '../hooks/useRealtimeEvent';
import { useChatContext } from '../contexts/ChatContext';
import { orderAssigneeDisplayLabel, orderQualificationAssigneeId } from '../utils/orderAssigneeUi';
import { formatOrderLogAuthor, formatOrderLogLine } from '../utils/orderLogLine';
import { logger } from '../utils/logger';

interface OrderDetailPanelProps {
  companyId: number;
  orderId: number;
  companyFields: CompanyField[];
  onClose: () => void;
  onOrderUpdated?: () => void;
  onNavigateToChat?: (ctx: { orderId: number; threadId: string | null }) => void;
  qualificationStages?: StageTemplate[];
  qualificationManagers?: CompanyMember[];
  qualificationStageId?: string;
  onQualificationStageChange?: (stageId: string) => void;
  onQualificationAssigneeChange?: (managerId: string) => void;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({
  companyId,
  orderId,
  companyFields,
  onClose,
  onOrderUpdated,
  onNavigateToChat,
  qualificationStages = [],
  qualificationManagers = [],
  qualificationStageId = '',
  onQualificationStageChange,
  onQualificationAssigneeChange,
}) => {
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [logs, setLogs] = useState<OrderLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stageRefresh, setStageRefresh] = useState(0);
  const toast = useToast();
  const navigate = useNavigate();
  const { chatState, chatDispatch } = useChatContext();

  const showQualification =
    onQualificationStageChange != null || onQualificationAssigneeChange != null;

  const fetchOrder = useCallback(
    async (opts?: { background?: boolean }) => {
      const showLoader = !opts?.background;
      if (showLoader) setLoading(true);
      try {
        const [orderData, logsData] = await Promise.all([
          ordersService.getById(companyId, orderId),
          ordersService.getLogs(companyId, orderId),
        ]);
        setOrder(orderData);
        setLogs(logsData);
      } catch (error) {
        logger.error('Failed to fetch order', error);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [companyId, orderId]
  );

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useRealtimeEvent(`order:${orderId}`, () => {
    fetchOrder({ background: true });
  });

  useEffect(() => {
    if (chatState.orderUpdateSignal === orderId) {
      fetchOrder({ background: true });
      chatDispatch({ type: 'CONSUME_ORDER_UPDATE', payload: orderId });
    }
  }, [chatState.orderUpdateSignal, orderId, fetchOrder, chatDispatch]);

  const logFormatCtx = useMemo(() => {
    const stageNames = new Map<number, string>();
    for (const s of qualificationStages) {
      stageNames.set(s.id, s.name);
    }
    if (order?.stage) {
      stageNames.set(order.stage.id, order.stage.name);
    }
    const assigneeNames = new Map<number, string>();
    for (const m of qualificationManagers) {
      const label = [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || m.email;
      assigneeNames.set(m.id, label);
    }
    if (order?.assignee) {
      const label =
        [order.assignee.first_name, order.assignee.last_name].filter(Boolean).join(' ').trim() ||
        order.assignee.email ||
        `ID ${order.assignee.id}`;
      assigneeNames.set(order.assignee.id, label);
    }
    return {
      stageLabel: (stageId: number | null | undefined) =>
        stageId == null ? '—' : (stageNames.get(stageId) ?? `этап #${stageId}`),
      assigneeLabel: (companyUserId: number | null | undefined) =>
        companyUserId == null ? 'не назначен' : (assigneeNames.get(companyUserId) ?? `менеджер #${companyUserId}`),
    };
  }, [qualificationStages, qualificationManagers, order?.stage, order?.assignee]);

  const handleToggleFrozen = async () => {
    if (!order) return;
    try {
      await ordersService.updateFrozen(companyId, orderId, !order.frozen);
      setOrder({ ...order, frozen: !order.frozen });
      onOrderUpdated?.();
      toast.success(order.frozen ? 'Заказ разморожен' : 'Заказ заморожен');
    } catch (error) {
      logger.error('Failed to toggle frozen', error);
      toast.error('Ошибка при изменении статуса заморозки');
    }
  };

  const handleClose = async (result: 'won' | 'lost') => {
    if (!order) return;
    if (!confirm(`Закрыть заказ как "${result === 'won' ? 'Выиграно' : 'Проиграно'}"?`)) return;
    try {
      await ordersService.close(companyId, orderId, result);
      fetchOrder({ background: true });
      onOrderUpdated?.();
      toast.success(`Заказ закрыт: ${result === 'won' ? 'Выиграно' : 'Проиграно'}`);
    } catch (error) {
      logger.error('Failed to close order', error);
      toast.error('Ошибка при закрытии заказа');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      setSubmitting(true);
      await ordersService.addComment(companyId, orderId, comment.trim());
      setComment('');
      const updatedLogs = await ordersService.getLogs(companyId, orderId);
      setLogs(updatedLogs);
    } catch (error) {
      logger.error('Failed to add comment', error);
      toast.error('Ошибка при добавлении комментария');
    } finally {
      setSubmitting(false);
    }
  };

  const orderFields = (order?.order_fields || {}) as Record<string, string | number | boolean | null>;
  const orderLevelFields = companyFields.filter((f) => f.level === 'order');

  const saveExtraField = useCallback(
    async (key: string, newValue: string | number | boolean | null) => {
      if (!order) return;
      try {
        const patch = { [key]: newValue } as Record<string, string | number | boolean | null>;
        const updated = await ordersService.updateExtraFields(companyId, orderId, patch);
        setOrder(updated);
        setStageRefresh((n) => n + 1);
        onOrderUpdated?.();
        toast.success('Данные сохранены');
      } catch (error) {
        logger.error('Failed to update extra fields', error);
        toast.error('Ошибка при сохранении данных');
      }
    },
    [companyId, orderId, order, onOrderUpdated, toast]
  );

  const setFieldValue = useCallback(
    (key: string, value: string | number | boolean | null) => {
      if (!order) return;
      const merged = { ...(order.order_fields as Record<string, unknown>), [key]: value };
      setOrder({ ...order, order_fields: merged });
      const patch = { [key]: value } as Record<string, string | number | boolean | null>;
      ordersService
        .updateFields(companyId, orderId, patch)
        .then((updated) => {
          setOrder(updated);
          setStageRefresh((n) => n + 1);
          onOrderUpdated?.();
          toast.success('Данные сохранены');
        })
        .catch((error) => {
          logger.error('Failed to update order fields', error);
          toast.error('Ошибка при сохранении данных');
        });
    },
    [companyId, orderId, order, onOrderUpdated, toast]
  );

  if (loading) {
    return (
      <div className="w-full max-w-[400px] bg-white border-l border-gray-200 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full max-w-[400px] bg-white border-l border-gray-200 flex items-center justify-center text-gray-400 text-sm">
        Заказ не найден
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-[64px] px-6 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-gray-400 flex-shrink-0" />
          <button
            type="button"
            onClick={() =>
              navigate({
                pathname: `/${companyId}/funnel`,
                search: new URLSearchParams({ order: String(orderId) }).toString(),
              })
            }
            className="text-left text-[14px] font-bold text-gray-900 truncate rounded-md px-1 -mx-1 py-0.5 transition-colors hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
            title="Открыть заказ на воронке"
          >
            Заказ #{order.order_number}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {onNavigateToChat && (
            <button
              onClick={() =>
                onNavigateToChat({
                  orderId,
                  threadId: order.thread_id ?? null,
                })
              }
              className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <MessageSquare size={13} /> Чат
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {showQualification && (
          <QualificationFormFields
            stages={qualificationStages}
            managers={qualificationManagers}
            currentStageId={qualificationStageId}
            currentAssigneeId={orderQualificationAssigneeId(order)}
            onUpdateStage={onQualificationStageChange}
            onUpdateAssignee={onQualificationAssigneeChange}
          />
        )}
        {/* Order Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-gray-400" />
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Заказ</h4>
          </div>
          <InfoRow label="Номер" value={`#${order.order_number}`} />
          {order.name && <InfoRow label="Название" value={order.name} />}
          {!showQualification && (
            <>
              <InfoRow label="Стадия" value={order.stage?.name || 'Без стадии'} />
              <InfoRow label="Ответственный" value={orderAssigneeDisplayLabel(order)} />
            </>
          )}
          <InfoRow label="Канал" value={order.initial_channel || '-'} />
          <InfoRow label="Создан" value={new Date(order.created_at).toLocaleString()} />
          {order.closed_at && (
            <InfoRow label="Закрыт" value={new Date(order.closed_at).toLocaleString()} />
          )}
          {order.result && (
            <InfoRow label="Результат" value={order.result === 'won' ? 'Выиграно' : 'Проиграно'} />
          )}
        </div>

        {/* Stage Progress */}
        {!order.closed_at && (
          <StageProgressSection companyId={companyId} orderId={orderId} refreshSignal={stageRefresh} />
        )}

        {/* Order Fields */}
        <CustomerFieldsEditor
          title="Данные заказа"
          fields={orderLevelFields}
          values={orderFields}
          onFieldChange={setFieldValue}
        />

        {/* Extra Fields (AI-discovered, editable) */}
        {Object.keys(order.extra_fields || {}).length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Дополнительно</h4>
            {Object.entries(order.extra_fields as Record<string, string | number | boolean | null>).map(([key, value]) => {
              const rawValue = value != null ? String(value) : '';
              const label = key.replace(/_/g, ' ');
              return (
                <FieldInput
                  key={key}
                  icon={<Target size={14} />}
                  label={label}
                  value={rawValue}
                  onChange={(newVal) => {
                    const merged = { ...(order.extra_fields as Record<string, unknown>), [key]: newVal === '' ? null : newVal };
                    setOrder({ ...order, extra_fields: merged });
                  }}
                  onBlur={(e) => {
                    const v = e.target.value;
                    saveExtraField(key, v === '' ? null : v);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleToggleFrozen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
              order.frozen
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {order.frozen ? <Unlock size={12} /> : <Lock size={12} />}
            {order.frozen ? 'Разморозить' : 'Заморозить'}
          </button>

          {!order.closed_at && (
            <>
              <button
                onClick={() => handleClose('won')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                <CheckCircle size={12} /> Выиграно
              </button>
              <button
                onClick={() => handleClose('lost')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              >
                <XCircle size={12} /> Проиграно
              </button>
            </>
          )}
        </div>

        {/* Tasks — full list lives on /orders/:orderId/tasks */}
        <div>
          <OrderTasksTeaser companyId={companyId} orderId={orderId} />
        </div>

        {/* Logs Timeline */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">История</h4>
          {logs.length === 0 && (
            <div className="text-[13px] text-gray-400 italic">Нет записей</div>
          )}
          <div className="space-y-2">
            {logs.map(log => {
              const line = formatOrderLogLine(log, logFormatCtx);
              const actor = formatOrderLogAuthor(log.author);
              return (
                <div key={log.id} className="flex gap-3 text-[12px]">
                  <div className="flex-shrink-0 mt-1">
                    <Clock size={12} className="text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 whitespace-pre-wrap break-words">{line}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(log.created_at).toLocaleString()}
                      {actor ? ` · ${actor}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Comment */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Комментарий</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Добавить комментарий..."
              className="form-input flex-1"
            />
            <button
              onClick={handleAddComment}
              disabled={submitting || !comment.trim()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-[12px] text-gray-400 flex-shrink-0">{label}</span>
    <span className="text-[12px] text-gray-900 font-medium text-right truncate">{value}</span>
  </div>
);

