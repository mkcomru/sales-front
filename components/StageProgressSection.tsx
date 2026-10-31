import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { ordersService } from '../services';
import { ConditionReportView } from './ConditionReportView';
import type { NextStageInfo, OrderStageRequirementsResponse, ConditionClauseApi, ConditionNodeApi } from '../types/api';

interface StageProgressSectionProps {
  companyId: number;
  orderId: number;
  refreshSignal?: number;
}

const STATUS_CONFIG = {
  met: { label: 'Готово', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  partial: { label: 'Частично', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  blocked: { label: 'Заблокировано', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
} as const;

export const StageProgressSection: React.FC<StageProgressSectionProps> = ({
  companyId,
  orderId,
  refreshSignal,
}) => {
  const [data, setData] = useState<OrderStageRequirementsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequirements = useCallback(async () => {
    try {
      const result = await ordersService.getStageRequirements(companyId, orderId);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, orderId]);

  useEffect(() => {
    setLoading(true);
    fetchRequirements();
  }, [fetchRequirements]);

  useEffect(() => {
    if (refreshSignal === undefined || refreshSignal === 0) return;
    fetchRequirements();
  }, [refreshSignal, fetchRequirements]);

  if (loading) {
    return (
      <div className="space-y-3">
        <SectionHeader />
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-gray-300" />
        </div>
      </div>
    );
  }

  if (!data || data.next_stages.length === 0) return null;

  return (
    <div className="space-y-3">
      <SectionHeader />
      <div className="space-y-2">
        {data.next_stages.map((info) => (
          <NextStageCard key={info.stage.id} info={info} />
        ))}
      </div>
    </div>
  );
};

const SectionHeader: React.FC = () => (
  <div className="flex items-center gap-2">
    <GitBranch size={13} className="text-gray-400" />
    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Прогресс воронки</h4>
  </div>
);

const NextStageCard: React.FC<{ info: NextStageInfo }> = ({ info }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[info.condition_status];
  const clauses = info.condition_report ? extractClauses(info.condition_report.root) : [];
  const metCount = clauses.filter((c) => c.result).length;
  const totalCount = clauses.length;

  return (
    <div className={`rounded-lg border ${cfg.border} overflow-hidden`}>
      {/* Stage header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 ${cfg.bg} transition-colors hover:opacity-90`}
      >
        {expanded ? <ChevronDown size={12} className={cfg.text} /> : <ChevronRight size={12} className={cfg.text} />}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: info.stage.color ?? '#64748b' }}
        />
        <span className={`text-[12px] font-semibold ${cfg.text} flex-1 text-left`}>{info.stage.name}</span>
        <span className={`text-[11px] font-medium ${cfg.text} tabular-nums`}>
          {metCount}/{totalCount}
        </span>
      </button>

      {/* Field checklist — always visible */}
      <div className="px-3 py-2 space-y-1 bg-white">
        {clauses.map((clause, i) => (
          <FieldStatusRow key={i} clause={clause} />
        ))}
        {clauses.length === 0 && info.condition_status === 'blocked' && (
          <div className="flex items-center gap-1.5 text-[11px] text-red-400 py-0.5">
            <AlertTriangle size={11} />
            <span>Ошибка вычисления условий</span>
          </div>
        )}
      </div>

      {/* Full condition tree — expandable */}
      {expanded && info.condition_report && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Дерево условий</div>
          <ConditionReportView root={info.condition_report.root} />
        </div>
      )}
    </div>
  );
};

const FieldStatusRow: React.FC<{ clause: ConditionClauseApi }> = ({ clause }) => {
  const fieldLabel = clause.field
    ? clause.field.replace(/^(order_fields|customer_fields)\./, '')
    : clause.description;
  const actualDisplay = formatActual(clause.actual);

  return (
    <div className="flex items-center gap-2 py-0.5">
      {clause.result ? (
        <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
      ) : (
        <XCircle size={12} className="text-red-400 flex-shrink-0" />
      )}
      <span className={`text-[12px] flex-1 min-w-0 truncate ${clause.result ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
        {fieldLabel}
      </span>
      <span className="text-[11px] text-gray-400 flex-shrink-0 max-w-[120px] truncate text-right">
        {actualDisplay}
      </span>
    </div>
  );
};

function extractClauses(node: ConditionNodeApi): ConditionClauseApi[] {
  if (node.type === 'clause') return [node];
  return node.children.flatMap(extractClauses);
}

function formatActual(actual: unknown): string {
  if (actual === null || actual === undefined) return 'не заполнено';
  if (typeof actual === 'boolean') return actual ? 'да' : 'нет';
  if (typeof actual === 'string') return actual === '' ? 'пусто' : actual;
  if (typeof actual === 'number') return String(actual);
  return '—';
}
