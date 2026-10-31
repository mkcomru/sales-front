import React, { useState, useEffect } from 'react';
import { X, Edit2, Lock, ChevronDown, ChevronRight, Code2, MessageSquare } from 'lucide-react';
import { pingsService } from '../services';
import type { StageTemplate, PingRule } from '../types/api';

interface StageDetailModalProps {
  companyId: number;
  stage: StageTemplate;
  onClose: () => void;
  onEdit: () => void;
}

export const StageDetailModal: React.FC<StageDetailModalProps> = ({
  companyId,
  stage,
  onClose,
  onEdit,
}) => {
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [pingRules, setPingRules] = useState<PingRule[]>([]);
  const hasCondition = stage.transition_condition && Object.keys(stage.transition_condition).length > 0;

  useEffect(() => {
    if (stage.is_final) return;
    pingsService.list(companyId, stage.id).then(setPingRules).catch(() => setPingRules([]));
  }, [companyId, stage.id, stage.is_final]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color ?? '#64748b' }}
            />
            <h3 className="text-[15px] font-bold text-gray-900">{stage.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            {!stage.is_system && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Редактировать"
              >
                <Edit2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4 text-[13px]">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Позиция</span>
            <p className="mt-0.5 font-medium text-gray-700">{stage.position}</p>
          </div>

          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Тип</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {stage.is_final && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded font-medium text-[12px]">
                  Финальная
                </span>
              )}
              {stage.auto_close && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-medium text-[12px]">
                  Автозакрытие
                </span>
              )}
              {stage.is_system && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium text-[12px] flex items-center gap-1">
                  <Lock size={10} /> Системная
                </span>
              )}
            </div>
          </div>

          {!stage.is_final && (
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Авто-напоминания (пинги)
              </span>
              {pingRules.length === 0 ? (
                <p className="mt-1.5 text-[12px] text-gray-400">Нет правил</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...pingRules]
                    .sort((a, b) =>
                      a.delay_seconds !== b.delay_seconds
                        ? a.delay_seconds - b.delay_seconds
                        : a.id - b.id
                    )
                    .map((r, i) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-700"
                      >
                        <MessageSquare size={10} />
                        #{i + 1} — {formatDelay(r.delay_seconds)}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}

          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Условие перехода
            </span>
            {!hasCondition ? (
              <p className="mt-1.5 text-[12px] text-gray-400">Не задано</p>
            ) : (
              <div className="mt-2">
                {/* JSON dropdown */}
                <button
                  type="button"
                  onClick={() => setJsonExpanded(!jsonExpanded)}
                  className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {jsonExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Code2 size={12} />
                  JSON
                </button>
                {jsonExpanded && (
                  <pre className="mt-1.5 p-3 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-mono text-gray-500 overflow-x-auto max-h-[160px] overflow-y-auto">
                    {JSON.stringify(stage.transition_condition, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>

        {!stage.is_system && (
          <button
            onClick={onEdit}
            className="mt-6 w-full px-4 py-2.5 text-[13px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            Редактировать стадию
          </button>
        )}
      </div>
    </div>
  );
};

function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ч`;
  return `${Math.round(seconds / 86400)} д`;
}
