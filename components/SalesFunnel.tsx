import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  Bot,
  Plus,
  Loader2,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Edit2,
  Trash2,
  Info,
} from 'lucide-react';
import { useStages } from '../hooks/useStages';
import { useOrders } from '../hooks/useOrders';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { ordersService, stagesService, companiesService, customersService } from '../services';
import { StageFormModal } from './StageFormModal';
import { StageDetailModal } from './StageDetailModal';
import { OrderDetailPanel } from './OrderDetailPanel';
import { CustomerProfile } from './CustomerProfile';
import { useToast } from '../hooks/useToast';
import { useAsync } from '../hooks/useAsync';
import { useChatContext } from '../contexts/ChatContext';
import { useIdentityContext } from '../contexts/IdentityContext';
import { extractApiErrorMessage } from '../utils/errors';
import { isAiManagedFromAssistantMode } from '../utils/assistantMode';
import { orderAssigneeDisplayLabel } from '../utils/orderAssigneeUi';
import { logger } from '../utils/logger';
import type { AssistantMode, OrderResponse, StageInfo, StageTemplate, Customer, AssigneeInfo } from '../types/api';
import type { CompanyField, CompanyMember } from '../types';

const FUNNEL_MGR_QUERY = 'funnel_mgr';

type FunnelAssigneeFilter =
  | { kind: 'all' }
  | { kind: 'ai' }
  | { kind: 'none' }
  | { kind: 'manager'; id: number };

function parseFunnelAssigneeFilter(raw: string | null): FunnelAssigneeFilter {
  if (raw == null || raw === '') {
    return { kind: 'all' };
  }
  if (raw === 'ai') {
    return { kind: 'ai' };
  }
  if (raw === 'none') {
    return { kind: 'none' };
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isNaN(n) && String(n) === raw.trim()) {
    return { kind: 'manager', id: n };
  }
  return { kind: 'all' };
}

function orderIsAiManaged(order: OrderResponse): boolean {
  return order.assistant_mode != null && isAiManagedFromAssistantMode(order.assistant_mode);
}

function orderMatchesFunnelAssigneeFilter(order: OrderResponse, f: FunnelAssigneeFilter): boolean {
  switch (f.kind) {
    case 'all':
      return true;
    case 'ai':
      return order.assignee == null && orderIsAiManaged(order);
    case 'none':
      return order.assignee == null && !orderIsAiManaged(order);
    case 'manager':
      return order.assignee?.id === f.id;
    default:
      return true;
  }
}

function companyMemberLabel(m: CompanyMember): string {
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ').trim();
  return name || m.email;
}

interface SalesFunnelProps {
  companyId: number;
  onNavigate: (
    view: 'inbox' | 'settings' | 'products' | 'funnel',
    options?: { inboxSearch?: Record<string, string> }
  ) => void;
}

export const SalesFunnel: React.FC<SalesFunnelProps> = ({ companyId, onNavigate }) => {
  const toast = useToast();
  const { identityState } = useIdentityContext();
  const { chatDispatch } = useChatContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stages, loading: stagesLoading, refetch: refetchStages } = useStages(companyId);
  const { orders, loading: ordersLoading, refetch } = useOrders(companyId);
  useRealtimeRefresh('orders', refetch);
  useRealtimeRefresh('stages', refetchStages);
  const [localOrders, setLocalOrders] = useState<OrderResponse[]>([]);
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);

  const loading = stagesLoading || ordersLoading;

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const funnelMgrRaw = searchParams.get(FUNNEL_MGR_QUERY);
  const assigneeFilter = useMemo(() => parseFunnelAssigneeFilter(funnelMgrRaw), [funnelMgrRaw]);

  const filteredOrders = useMemo(
    () => localOrders.filter((o) => orderMatchesFunnelAssigneeFilter(o, assigneeFilter)),
    [localOrders, assigneeFilter]
  );

  const regularStages = stages.filter(s => !s.is_final);
  const finalStages = stages.filter(s => s.is_final);
  const allColumns = [...regularStages, ...finalStages];

  const ordersByStage = (stageId: number) =>
    filteredOrders.filter(o => o.stage?.id === stageId);

  const unstaged = filteredOrders.filter(o => !o.stage);

  const handleDragStart = useCallback((orderId: number) => {
    setDraggedOrderId(orderId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedOrderId(null);
  }, []);

  const handleDrop = useCallback(async (stageId: number) => {
    if (draggedOrderId === null) return;

    const targetStage = stages.find(s => s.id === stageId);
    if (!targetStage) return;

    const stageInfo: StageInfo = {
      id: targetStage.id,
      name: targetStage.name,
      color: targetStage.color,
      position: targetStage.position,
    };

    const prevOrders = localOrders;

    setLocalOrders(prev =>
      prev.map(o => o.id === draggedOrderId ? { ...o, stage: stageInfo } : o)
    );
    setDraggedOrderId(null);

    try {
      await ordersService.update(companyId, draggedOrderId, { stage_id: stageId });
    } catch {
      setLocalOrders(prevOrders);
      refetch();
    }
  }, [draggedOrderId, companyId, stages, localOrders, refetch]);

  const [formModalStage, setFormModalStage] = useState<StageTemplate | null | 'new'>(null);
  const [detailModalStage, setDetailModalStage] = useState<StageTemplate | null>(null);
  const [companyFields, setCompanyFields] = useState<CompanyField[]>([]);

  const orderParam = searchParams.get('order');
  const selectedOrderId = orderParam ? parseInt(orderParam, 10) || null : null;

  const selectedOrder = useMemo(
    () => (selectedOrderId ? localOrders.find((o) => o.id === selectedOrderId) ?? null : null),
    [selectedOrderId, localOrders]
  );

  const funnelQualificationStageId = selectedOrder?.stage ? String(selectedOrder.stage.id) : '';

  const setSelectedOrderId = useCallback((id: number | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) {
        next.set('order', String(id));
      } else {
        next.delete('order');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [managers, setManagers] = useState<CompanyMember[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    companiesService.getFields(companyId).then(setCompanyFields).catch(() => {});
    companiesService.listMembers(companyId).then((res) => {
      setManagers(Array.isArray(res) ? res : (res.items || []));
    }).catch(() => {});
  }, [companyId]);

  const [managerFilterOpen, setManagerFilterOpen] = useState(false);
  const managerFilterRef = useRef<HTMLDivElement>(null);

  const { data: company, refetch: refetchCompany, isLoading: companyLoading } = useAsync(
    () => companiesService.getById(companyId),
    [companyId],
  );

  const canConfigureMetricsTarget = useMemo(() => {
    const u = identityState.currentUser;
    if (!u) return false;
    if (u.is_superuser) return true;
    const r = u.companies.find((c) => c.company_id === companyId);
    return r ? ['admin', 'owner'].includes(r.role) : false;
  }, [identityState.currentUser, companyId]);

  const metricsTargetButtonLabel = useMemo(() => {
    if (!company) return companyLoading ? 'Цель (метрики)…' : 'Цель (метрики): недоступно';
    const sid = company.target_stage_id;
    if (sid == null) return 'Цель (метрики): не задана';
    const st = stages.find((s) => s.id === sid);
    return st ? `Цель (метрики): ${st.name}` : `Цель (метрики): #${sid}`;
  }, [company, companyLoading, stages]);

  const [metricsTargetOpen, setMetricsTargetOpen] = useState(false);
  const metricsTargetRef = useRef<HTMLDivElement>(null);
  const [savingMetricsTarget, setSavingMetricsTarget] = useState(false);

  const applyMetricsTarget = useCallback(
    async (stageId: number | null) => {
      if (!canConfigureMetricsTarget) return;
      setSavingMetricsTarget(true);
      setMetricsTargetOpen(false);
      try {
        await companiesService.patch(companyId, { target_stage_id: stageId });
        toast.success('Целевая стадия для метрик обновлена');
        await refetchCompany();
      } catch (error) {
        toast.error(extractApiErrorMessage(error));
        logger.error('metrics target_stage_id update failed', error);
      } finally {
        setSavingMetricsTarget(false);
      }
    },
    [canConfigureMetricsTarget, companyId, refetchCompany, toast],
  );

  useEffect(() => {
    if (!metricsTargetOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = metricsTargetRef.current;
      if (el && !el.contains(e.target as Node)) {
        setMetricsTargetOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [metricsTargetOpen]);

  const setFunnelAssigneeFilter = useCallback(
    (next: FunnelAssigneeFilter) => {
      setManagerFilterOpen(false);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next.kind === 'all') {
            p.delete(FUNNEL_MGR_QUERY);
          } else if (next.kind === 'ai') {
            p.set(FUNNEL_MGR_QUERY, 'ai');
          } else if (next.kind === 'none') {
            p.set(FUNNEL_MGR_QUERY, 'none');
          } else {
            p.set(FUNNEL_MGR_QUERY, String(next.id));
          }
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (!managerFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = managerFilterRef.current;
      if (el && !el.contains(e.target as Node)) {
        setManagerFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [managerFilterOpen]);

  const hasAiOrders = useMemo(
    () => localOrders.some((o) => orderIsAiManaged(o)),
    [localOrders]
  );
  const hasUnassignedOrders = useMemo(
    () => localOrders.some((o) => o.assignee == null && !orderIsAiManaged(o)),
    [localOrders]
  );

  const managerOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const o of localOrders) {
      if (o.assignee?.id != null) {
        ids.add(o.assignee.id);
      }
    }
    return managers
      .filter((m) => ids.has(m.id))
      .sort((a, b) => companyMemberLabel(a).localeCompare(companyMemberLabel(b), 'ru'));
  }, [localOrders, managers]);

  const managersInMenu = useMemo(() => {
    if (assigneeFilter.kind !== 'manager') {
      return managerOptions;
    }
    if (managerOptions.some((m) => m.id === assigneeFilter.id)) {
      return managerOptions;
    }
    const fromMembers = managers.find((x) => x.id === assigneeFilter.id);
    if (fromMembers) {
      return [fromMembers, ...managerOptions];
    }
    return managerOptions;
  }, [assigneeFilter, managerOptions, managers]);

  const filterButtonLabel = useMemo(() => {
    switch (assigneeFilter.kind) {
      case 'all':
        return 'Все менеджеры';
      case 'ai':
        return 'AI ассистент';
      case 'none':
        return 'Без ответственного';
      case 'manager': {
        const m = managers.find((x) => x.id === assigneeFilter.id);
        return m ? companyMemberLabel(m) : `Ответственный #${assigneeFilter.id}`;
      }
      default:
        return 'Все менеджеры';
    }
  }, [assigneeFilter, managers]);

  useEffect(() => {
    if (selectedOrderId == null) return;
    const order = localOrders.find((o) => o.id === selectedOrderId);
    if (!order) return;
    if (!orderMatchesFunnelAssigneeFilter(order, assigneeFilter)) {
      setSelectedOrderId(null);
    }
  }, [selectedOrderId, localOrders, assigneeFilter, setSelectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedCustomer(null);
      return;
    }
    const order = localOrders.find(o => o.id === selectedOrderId);
    if (!order?.customer?.id) {
      setSelectedCustomer(null);
      return;
    }
    customersService.getCustomer(companyId, String(order.customer.id))
      .then(setSelectedCustomer)
      .catch(() => setSelectedCustomer(null));
  }, [selectedOrderId, companyId, localOrders]);

  const handleCustomerFieldChange = useCallback(async (key: string, value: string | number | boolean | null) => {
    if (!selectedCustomer) return;
    const customerId = String(selectedCustomer.customer_id ?? selectedCustomer.id);
    setSelectedCustomer(prev => prev ? {
      ...prev,
      customer_fields: { ...(prev.customer_fields ?? {}), [key]: value },
    } : prev);
    try {
      await customersService.updateFields(companyId, customerId, { [key]: value });
    } catch (error) {
      logger.error('Failed to update customer field', error);
    }
  }, [companyId, selectedCustomer]);

  const handleFunnelUpdateStage = useCallback(
    async (newStageId: string) => {
      if (!selectedOrderId) return;
      const template = newStageId ? stages.find((s) => String(s.id) === newStageId) : null;
      const stageInfo: StageInfo | null = template
        ? { id: template.id, name: template.name, color: template.color, position: template.position }
        : null;
      const prevOrders = localOrders;
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === selectedOrderId ? { ...o, stage: stageInfo } : o))
      );
      try {
        let stage_id: number | null;
        if (newStageId === '') {
          stage_id = null;
        } else {
          const n = Number.parseInt(newStageId, 10);
          if (Number.isNaN(n)) {
            throw new Error('Некорректная стадия');
          }
          stage_id = n;
        }
        await ordersService.update(companyId, selectedOrderId, { stage_id });
        chatDispatch({ type: 'SET_ORDER_UPDATE_SIGNAL', payload: selectedOrderId });
        refetch();
        toast.success('Стадия обновлена');
      } catch (error) {
        setLocalOrders(prevOrders);
        toast.error(extractApiErrorMessage(error));
      }
    },
    [selectedOrderId, companyId, stages, localOrders, refetch, toast, chatDispatch]
  );

  const handleFunnelUpdateAssignee = useCallback(
    async (managerId: string) => {
      if (!selectedOrderId) return;
      const apiAssigneeId =
        managerId === '' || managerId === 'ai-agent' ? null : Number.parseInt(managerId, 10);
      if (managerId !== '' && managerId !== 'ai-agent' && (apiAssigneeId === null || Number.isNaN(apiAssigneeId))) {
        toast.error('Некорректный ответственный');
        return;
      }
      const manager =
        managerId === '' || managerId === 'ai-agent'
          ? null
          : managers.find((m) => String(m.id) === managerId);
      if (managerId !== '' && managerId !== 'ai-agent' && !manager) {
        toast.error('Менеджер не найден');
        return;
      }
      const newAssignee: AssigneeInfo | null =
        apiAssigneeId === null
          ? null
          : {
              id: manager!.id,
              user_id: manager!.user_id,
              first_name: manager!.first_name,
              last_name: manager!.last_name,
              role: manager!.role,
            };
      const prevOrders = localOrders;
      const currentOrder = localOrders.find((o) => o.id === selectedOrderId);
      const assistant_mode: AssistantMode =
        managerId === 'ai-agent'
          ? 'active'
          : managerId !== ''
            ? 'inactive'
            : (currentOrder?.assistant_mode ?? null);
      setLocalOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderId
            ? { ...o, assignee: newAssignee, ...(assistant_mode != null && { assistant_mode }) }
            : o
        )
      );
      try {
        await ordersService.updateAssignee(companyId, selectedOrderId, apiAssigneeId);
        chatDispatch({ type: 'SET_ORDER_UPDATE_SIGNAL', payload: selectedOrderId });
        refetch();
        const label =
          managerId === 'ai-agent'
            ? 'AI Agent'
            : managerId === ''
              ? 'Не назначен'
              : `${manager!.first_name} ${manager!.last_name}`.trim() || manager!.email;
        toast.success(`Ответственный: ${label}`);
      } catch (error) {
        setLocalOrders(prevOrders);
        toast.error(extractApiErrorMessage(error));
      }
    },
    [selectedOrderId, companyId, managers, localOrders, refetch, toast, chatDispatch]
  );

  const handleAddStage = useCallback(() => setFormModalStage('new'), []);
  const handleEditStage = useCallback((stage: StageTemplate) => setFormModalStage(stage), []);
  const handleDetailStage = useCallback((stage: StageTemplate) => setDetailModalStage(stage), []);

  const handleDeleteStage = useCallback(
    async (stage: StageTemplate) => {
      if (!confirm(`Удалить стадию «${stage.name}»? Заказы с этой стадией потеряют привязку.`)) return;
      try {
        await stagesService.delete(companyId, stage.id);
        toast.success('Стадия удалена');
        refetchStages();
      } catch (error) {
        toast.error(extractApiErrorMessage(error));
      }
    },
    [companyId, refetchStages, toast]
  );

  const handleReorderStage = useCallback(
    async (stage: StageTemplate, direction: 'up' | 'down') => {
      const idx = allColumns.findIndex(s => s.id === stage.id);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= allColumns.length) return;

      const reordered = [...allColumns];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      try {
        await stagesService.reorder(companyId, reordered.map(s => s.id));
        refetchStages();
      } catch (error) {
        toast.error(extractApiErrorMessage(error));
      }
    },
    [companyId, allColumns, refetchStages, toast]
  );

  const handleFormSaved = useCallback(() => {
    refetchStages();
  }, [refetchStages]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white flex-col overflow-hidden">
      <div className="h-[64px] px-8 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-white z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-[15px] font-bold text-gray-900">Воронка Продаж</h2>
          <div className="h-4 w-px bg-gray-200" />
          <div className="relative" ref={managerFilterRef}>
            <button
              type="button"
              onClick={() => setManagerFilterOpen((v) => !v)}
              className="flex items-center gap-2 text-[13px] font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50"
              aria-expanded={managerFilterOpen}
              aria-haspopup="listbox"
            >
              {filterButtonLabel}
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform shrink-0 ${managerFilterOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {managerFilterOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-30 min-w-[240px] max-h-[min(320px,70vh)] overflow-y-auto py-1 bg-white border border-gray-200 rounded-lg shadow-lg"
                role="listbox"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={assigneeFilter.kind === 'all'}
                  onClick={() => setFunnelAssigneeFilter({ kind: 'all' })}
                  className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                    assigneeFilter.kind === 'all' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Все менеджеры
                </button>
                {hasAiOrders && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={assigneeFilter.kind === 'ai'}
                    onClick={() => setFunnelAssigneeFilter({ kind: 'ai' })}
                    className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                      assigneeFilter.kind === 'ai' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    AI ассистент
                  </button>
                )}
                {hasUnassignedOrders && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={assigneeFilter.kind === 'none'}
                    onClick={() => setFunnelAssigneeFilter({ kind: 'none' })}
                    className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                      assigneeFilter.kind === 'none' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    Без ответственного
                  </button>
                )}
                {managersInMenu.length > 0 && (
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    {managersInMenu.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={assigneeFilter.kind === 'manager' && assigneeFilter.id === m.id}
                        onClick={() => setFunnelAssigneeFilter({ kind: 'manager', id: m.id })}
                        className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                          assigneeFilter.kind === 'manager' && assigneeFilter.id === m.id
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {companyMemberLabel(m)}
                      </button>
                    ))}
                  </div>
                )}
                {assigneeFilter.kind === 'manager' &&
                  !managers.find((x) => x.id === assigneeFilter.id) &&
                  managerOptions.every((m) => m.id !== assigneeFilter.id) && (
                    <div className="px-3 py-2 text-[11px] text-amber-700 bg-amber-50 border-t border-amber-100">
                      Фильтр: ответственный #{assigneeFilter.id} (нет среди участников компании)
                    </div>
                  )}
              </div>
            )}
          </div>
          <div className="h-4 w-px bg-gray-200" />
          {canConfigureMetricsTarget ? (
            <div className="relative" ref={metricsTargetRef}>
              <button
                type="button"
                disabled={savingMetricsTarget}
                onClick={() => setMetricsTargetOpen((v) => !v)}
                className="flex items-center gap-2 text-[13px] font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                aria-expanded={metricsTargetOpen}
                aria-haspopup="listbox"
                title="Стадия успеха для ежедневных снимков метрик (конверсия в аналитике)"
              >
                {metricsTargetButtonLabel}
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform shrink-0 ${metricsTargetOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {metricsTargetOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-30 min-w-[260px] max-h-[min(320px,70vh)] overflow-y-auto py-1 bg-white border border-gray-200 rounded-lg shadow-lg"
                  role="listbox"
                >
                  {!company ? (
                    <div className="px-3 py-2 text-[13px] text-gray-500">
                      {companyLoading ? 'Загрузка…' : 'Не удалось загрузить компанию'}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        role="option"
                        aria-selected={company.target_stage_id == null}
                        onClick={() => void applyMetricsTarget(null)}
                        className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                          company.target_stage_id == null
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        Не задана
                      </button>
                      {allColumns.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          role="option"
                          aria-selected={company.target_stage_id === s.id}
                          onClick={() => void applyMetricsTarget(s.id)}
                          className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                            company.target_stage_id === s.id
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span
              className="text-[13px] font-medium text-gray-600 max-w-[240px] truncate"
              title={metricsTargetButtonLabel}
            >
              {metricsTargetButtonLabel}
            </span>
          )}
        </div>
        <button
          onClick={handleAddStage}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          <Plus size={14} /> Добавить стадию
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-sidebar [&::-webkit-scrollbar]:hidden">
        <div className="h-full flex p-6 gap-6 min-w-max">
          {unstaged.length > 0 && (
            <KanbanColumn
              title="Без стадии"
              color={null}
              count={unstaged.length}
              orders={unstaged}
              onOrderClick={setSelectedOrderId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              draggedOrderId={draggedOrderId}
            />
          )}

          {allColumns.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              count={ordersByStage(stage.id).length}
              orders={ordersByStage(stage.id)}
              onOrderClick={setSelectedOrderId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              draggedOrderId={draggedOrderId}
              onEdit={handleEditStage}
              onDelete={handleDeleteStage}
              onReorder={handleReorderStage}
              onDetail={handleDetailStage}
              canMoveUp={stages.indexOf(stage) > 0}
              canMoveDown={stages.indexOf(stage) < stages.length - 1}
            />
          ))}

          {allColumns.length === 0 && unstaged.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Нет стадий и заказов
            </div>
          )}

          {allColumns.length === 0 && (
            <button
              onClick={handleAddStage}
              className="flex flex-col items-center justify-center gap-2 w-[300px] h-[160px] flex-shrink-0 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-colors"
            >
              <Plus size={24} />
              <span className="text-[13px] font-medium">Добавить стадию</span>
            </button>
          )}
        </div>
      </div>

      {selectedOrderId && selectedCustomer && (
        <CustomerProfile
          customer={selectedCustomer}
          stages={stages}
          companyId={companyId}
          companyFields={companyFields}
          managers={managers}
          currentOrderId={selectedOrderId}
          customerId={selectedCustomer.customer_id ?? parseInt(selectedCustomer.id, 10)}
          onFieldChange={handleCustomerFieldChange}
        />
      )}
      {selectedOrderId && (
        <OrderDetailPanel
          companyId={companyId}
          orderId={selectedOrderId}
          companyFields={companyFields}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={refetch}
          qualificationStages={stages}
          qualificationManagers={managers}
          qualificationStageId={funnelQualificationStageId}
          onQualificationStageChange={handleFunnelUpdateStage}
          onQualificationAssigneeChange={handleFunnelUpdateAssignee}
          onNavigateToChat={({ orderId: oid, threadId }) => {
            const q: Record<string, string> = { order: String(oid) };
            if (threadId) {
              q.thread = threadId;
            }
            setSelectedOrderId(null);
            onNavigate('inbox', { inboxSearch: q });
          }}
        />
      )}
      </div>

      {formModalStage !== null && (
        <StageFormModal
          companyId={companyId}
          stage={formModalStage === 'new' ? null : formModalStage}
          stages={stages}
          onClose={() => setFormModalStage(null)}
          onSaved={handleFormSaved}
        />
      )}

      {detailModalStage && (
        <StageDetailModal
          companyId={companyId}
          stage={detailModalStage}
          onClose={() => setDetailModalStage(null)}
          onEdit={() => {
            setDetailModalStage(null);
            setFormModalStage(detailModalStage);
          }}
        />
      )}
    </div>
  );
};

interface ColumnPropsBase {
  title?: string;
  color?: string | null;
  count: number;
  orders: OrderResponse[];
  onOrderClick: (orderId: number) => void;
  onDragStart: (orderId: number) => void;
  onDragEnd: () => void;
  draggedOrderId: number | null;
}

interface UnstagedColumnProps extends ColumnPropsBase {
  stage?: never;
  onDrop?: never;
  onEdit?: never;
  onDelete?: never;
  onReorder?: never;
  onDetail?: never;
  canMoveUp?: never;
  canMoveDown?: never;
}

interface StagedColumnProps extends ColumnPropsBase {
  stage: StageTemplate;
  onDrop: (stageId: number) => void;
  onEdit: (stage: StageTemplate) => void;
  onDelete: (stage: StageTemplate) => void;
  onReorder: (stage: StageTemplate, direction: 'up' | 'down') => void;
  onDetail: (stage: StageTemplate) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

type ColumnProps = UnstagedColumnProps | StagedColumnProps;

const KanbanColumn: React.FC<ColumnProps> = (props) => {
  const {
    count,
    orders,
    onOrderClick,
    onDragStart,
    onDragEnd,
    draggedOrderId,
  } = props;

  const hasStage = 'stage' in props && props.stage != null;
  const stage = hasStage ? props.stage : null;
  const title = stage?.name ?? props.title ?? '';
  const color = stage?.color ?? props.color ?? null;
  const stageId = stage?.id;
  const onDrop = hasStage ? props.onDrop : undefined;
  const onEdit = hasStage ? props.onEdit : undefined;
  const onDelete = hasStage ? props.onDelete : undefined;
  const onReorder = hasStage ? props.onReorder : undefined;
  const onDetail = hasStage ? props.onDetail : undefined;
  const canMoveUp = hasStage ? props.canMoveUp : false;
  const canMoveDown = hasStage ? props.canMoveDown : false;

  const [isDragOver, setIsDragOver] = useState(false);
  const isDroppable = !!onDrop && !!stageId;
  const isFinal = stage?.is_final ?? false;

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDroppable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (onDrop && stageId) {
      onDrop(stageId);
    }
  };

  return (
    <div
      className="flex flex-col w-[300px] h-full flex-shrink-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          {color && (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          )}
          <span className="text-[13px] font-bold text-gray-700">{title}</span>
          <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center">{count}</span>
          {isFinal && (
            <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-bold uppercase">финал</span>
          )}
        </div>
        {hasStage && stage && (
          <div className="flex items-center gap-0.5 relative">
            {!stage.is_system && (
              <>
                <button
                  onClick={() => onReorder(stage, 'up')}
                  disabled={!canMoveUp}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded transition-colors"
                  title="Вверх"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => onReorder(stage, 'down')}
                  disabled={!canMoveDown}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded transition-colors"
                  title="Вниз"
                >
                  <ChevronDownIcon size={14} />
                </button>
              </>
            )}
            <button
              onClick={() => onDetail(stage)}
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="Подробнее"
            >
              <Info size={14} />
            </button>
            {!stage.is_system && (
              <>
                <button
                  onClick={() => onEdit(stage)}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  title="Редактировать"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => onDelete(stage)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto pr-2 space-y-3 pb-10 rounded-xl transition-all duration-150 ${
        isDragOver && isDroppable ? 'bg-indigo-50/70 ring-2 ring-indigo-200 ring-inset' : ''
      }`}>
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={() => onOrderClick(order.id)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggedOrderId === order.id}
          />
        ))}

        {orders.length === 0 && (
          <div className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 h-[120px] transition-colors duration-150 ${
            isDragOver && isDroppable ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-100'
          }`}>
            {isDragOver && isDroppable ? (
              <span className="text-[12px] font-medium text-indigo-400">Отпустите здесь</span>
            ) : (
              <span className="text-[12px] font-medium text-gray-400">Нет заказов</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface OrderCardProps {
  order: OrderResponse;
  onClick: () => void;
  onDragStart: (orderId: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, onDragStart, onDragEnd, isDragging }) => {
  // Prevents click from firing when user just finished dragging the card
  const justDragged = useRef(false);

  const customerName = order.customer?.name || `Клиент #${order.customer?.id || '?'}`;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=random&size=48`;
  const assigneeName = order.assignee
    ? `${order.assignee.first_name} ${order.assignee.last_name}`.trim()
    : null;
  const assigneeDisplay = orderAssigneeDisplayLabel(order);
  const isAiManaged = orderIsAiManaged(order);
  const showBotAssigneeIcon = isAiManaged;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    // dataTransfer payload isn't needed since we manage id in React state,
    // but some browsers require at least one dataTransfer.setData call to initiate drag
    e.dataTransfer.setData('text/plain', String(order.id));
    onDragStart(order.id);
  };

  const handleDragEnd = () => {
    justDragged.current = true;
    // setTimeout(0) ensures this clears after any click event that may fire post-dragend
    setTimeout(() => {
      justDragged.current = false;
    }, 0);
    onDragEnd();
  };

  const handleClick = () => {
    if (justDragged.current) return;
    onClick();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-grab active:cursor-grabbing group select-none ${
        isDragging ? 'opacity-40 scale-95 shadow-none' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <img src={avatarUrl} alt={customerName} className="w-6 h-6 rounded-full object-cover" />
          <span className="text-[13px] font-semibold text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">
            {customerName}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium">#{order.order_number}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {order.result && (
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
            order.result === 'won'
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {order.result === 'won' ? 'Выиграно' : 'Проиграно'}
          </span>
        )}
        {order.frozen && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-100">
            Заморожен
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-2 overflow-hidden w-full">
          {showBotAssigneeIcon ? (
            <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0" title="AI Agent">
              <Bot size={12} />
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-full bg-gray-100 flex-shrink-0 border border-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500"
              title={assigneeDisplay}
            >
              {assigneeName?.charAt(0) || '?'}
            </div>
          )}
          <span className="text-[11px] text-gray-400 truncate flex-1 block">
            {assigneeDisplay}
          </span>
          <span className="text-[10px] text-gray-300 flex-shrink-0">
            {new Date(order.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};
