import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Loader2, MessageSquare, ArrowDown } from 'lucide-react';
import { pingsService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { extractApiErrorMessage } from '../../utils/errors';
import { PingRuleInlineEditor } from './PingRuleInlineEditor';
import type { PingRule } from '../../types/api';

const MAX_PINGS_PER_STAGE = 5;

interface PingRulesSectionProps {
  companyId: number;
  stageId: number;
  onRulesChange?: () => void;
}

function comparePingRulesByDelay(a: PingRule, b: PingRule): number {
  if (a.delay_seconds !== b.delay_seconds) return a.delay_seconds - b.delay_seconds;
  return a.id - b.id;
}

function getNextPosition(existing: PingRule[]): number {
  const used = new Set(existing.map((r) => r.position));
  for (let p = 1; p <= MAX_PINGS_PER_STAGE; p++) {
    if (!used.has(p)) return p;
  }
  return MAX_PINGS_PER_STAGE;
}

type Panel = null | 'create' | { edit: PingRule };

export const PingRulesSection: React.FC<PingRulesSectionProps> = ({
  companyId,
  stageId,
  onRulesChange,
}) => {
  const toast = useToast();
  const [rules, setRules] = useState<PingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);

  const sortedRules = useMemo(() => [...rules].sort(comparePingRulesByDelay), [rules]);

  const takenDelaysForCreate = useMemo(
    () => new Set(rules.map((r) => r.delay_seconds)),
    [rules]
  );

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const list = await pingsService.list(companyId, stageId);
      setRules(list);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, stageId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSaved = useCallback(() => {
    setPanel(null);
    fetchRules();
    onRulesChange?.();
  }, [fetchRules, onRulesChange]);

  const handleDelete = useCallback(
    async (rule: PingRule) => {
      if (!confirm(`Удалить шаг ${sortedRules.findIndex((r) => r.id === rule.id) + 1}?`)) return;
      try {
        await pingsService.delete(companyId, rule.id);
        toast.success('Удалено');
        if (panel && typeof panel === 'object' && 'edit' in panel && panel.edit.id === rule.id) {
          setPanel(null);
        }
        handleSaved();
      } catch (error) {
        toast.error(extractApiErrorMessage(error));
      }
    },
    [companyId, toast, handleSaved, panel, sortedRules]
  );

  const canAdd = rules.length < MAX_PINGS_PER_STAGE;
  const nextPosition = getNextPosition(rules);
  const isEditing = (rule: PingRule) =>
    panel !== null && typeof panel === 'object' && 'edit' in panel && panel.edit.id === rule.id;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare size={13} className="text-gray-400 flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Цепочка напоминаний
            </h4>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
              Сверху вниз — по возрастанию паузы; на стадии не может быть двух правил с одной паузой.
            </p>
          </div>
        </div>
        {canAdd && panel !== 'create' && sortedRules.length > 0 && (
          <button
            type="button"
            onClick={() => setPanel('create')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200/90 rounded-xl transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} /> Добавить шаг
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {sortedRules.length === 0 && !panel && (
            <div className="py-4 px-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/60 text-center">
              <p className="text-[13px] text-neutral-500 mb-3">
                Пока цепочки нет — покупателю не уйдёт авто-напоминание на этой стадии.
              </p>
              {canAdd && (
                <button
                  type="button"
                  onClick={() => setPanel('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <Plus size={16} /> Первый шаг цепочки
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {sortedRules.map((rule, stepIdx) => {
              const step = stepIdx + 1;
              const showEditor = isEditing(rule);
              const showConnector = stepIdx < sortedRules.length - 1 && !showEditor;

              return (
                <React.Fragment key={rule.id}>
                  {showEditor ? (
                    <PingRuleInlineEditor
                      key={`edit-${rule.id}`}
                      companyId={companyId}
                      stageId={stageId}
                      mode="edit"
                      rule={rule}
                      createPosition={rule.position}
                      chainStep={step}
                      takenDelaySeconds={
                        new Set(
                          rules.filter((r) => r.id !== rule.id).map((r) => r.delay_seconds)
                        )
                      }
                      onCancel={() => setPanel(null)}
                      onSaved={handleSaved}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-sm transition-all">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-[13px] font-bold text-white tabular-nums">
                        {step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-neutral-800">
                            {formatDelay(rule.delay_seconds)} молчания
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              rule.content_type === 'static'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-violet-100 text-violet-800'
                            }`}
                          >
                            {rule.content_type === 'static' ? 'Текст' : 'AI'}
                          </span>
                        </div>
                        {(rule.prompt_override || rule.static_content) && (
                          <p className="text-[11px] text-neutral-500 truncate mt-1">
                            {rule.prompt_override || rule.static_content}
                          </p>
                        )}
                        {rule.attachments?.length ? (
                          <p className="text-[11px] text-neutral-400 mt-1">
                            Вложений: {rule.attachments.length}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setPanel({ edit: rule })}
                          className="p-2 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors"
                          title="Изменить"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  {showConnector && (
                    <div className="flex justify-center py-0.5 text-neutral-300" aria-hidden>
                      <ArrowDown size={14} strokeWidth={2.5} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {panel === 'create' && canAdd && (
            <PingRuleInlineEditor
              key={`create-${sortedRules.length}`}
              companyId={companyId}
              stageId={stageId}
              mode="create"
              rule={null}
              createPosition={nextPosition}
              chainStep={sortedRules.length + 1}
              takenDelaySeconds={takenDelaysForCreate}
              onCancel={() => setPanel(null)}
              onSaved={handleSaved}
            />
          )}

          {sortedRules.length > 0 && canAdd && panel !== 'create' && (
            <button
              type="button"
              onClick={() => setPanel('create')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-neutral-200 text-[13px] font-semibold text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} /> Следующий шаг цепочки
            </button>
          )}
        </>
      )}
    </div>
  );
};

function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ч`;
  return `${Math.round(seconds / 86400)} д`;
}
