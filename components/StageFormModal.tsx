import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { stagesService, companiesService } from '../services';
import type { StageTemplate, CompanyField } from '../types/api';
import { useToast } from '../hooks/useToast';
import { extractApiErrorMessage } from '../utils/errors';
import { ConditionBuilder } from './condition-builder/ConditionBuilder';
import { PingRulesSection } from './pings/PingRulesSection';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'];

interface StageFormState {
  name: string;
  color: string;
  is_final: boolean;
  auto_close: boolean;
  transition_condition: Record<string, unknown> | null;
}

interface StageFormModalProps {
  companyId: number;
  stage: StageTemplate | null;
  stages: StageTemplate[];
  onClose: () => void;
  onSaved: () => void;
}

const labelClass =
  'block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2';

const inputClass =
  'w-full px-4 py-3 rounded-2xl bg-neutral-50 ring-1 ring-black/[0.06] text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:bg-white';

export const StageFormModal: React.FC<StageFormModalProps> = ({
  companyId,
  stage,
  stages,
  onClose,
  onSaved,
}) => {
  const toast = useToast();
  const [fields, setFields] = useState<CompanyField[]>([]);
  const [form, setForm] = useState<StageFormState>({
    name: stage?.name ?? '',
    color: stage?.color ?? COLORS[stages.length % COLORS.length],
    is_final: stage?.is_final ?? false,
    auto_close: stage?.auto_close ?? false,
    transition_condition: stage?.transition_condition ?? null,
  });
  const [isSaving, setIsSaving] = useState(false);

  const showPings = Boolean(stage && !form.is_final);

  useEffect(() => {
    if (stage) {
      setForm({
        name: stage.name,
        color: stage.color ?? '#64748b',
        is_final: stage.is_final,
        auto_close: stage.auto_close,
        transition_condition: stage.transition_condition ?? null,
      });
    } else {
      setForm({
        name: '',
        color: COLORS[stages.length % COLORS.length],
        is_final: false,
        auto_close: false,
        transition_condition: null,
      });
    }
  }, [stage, stages.length]);

  useEffect(() => {
    companiesService.getFields(companyId).then(setFields).catch(() => {});
  }, [companyId]);

  const handleConditionChange = useCallback((value: Record<string, unknown> | null) => {
    setForm((f) => ({ ...f, transition_condition: value }));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Введите название стадии');
      return;
    }
    if (form.auto_close && !form.is_final) {
      toast.error('Автозакрытие доступно только для финальных стадий');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: form.name,
        color: form.color,
        is_final: form.is_final,
        auto_close: form.auto_close,
        transition_condition: form.transition_condition ?? undefined,
      };
      if (stage) {
        await stagesService.update(companyId, stage.id, payload);
        toast.success('Стадия обновлена');
      } else {
        await stagesService.create(companyId, payload);
        toast.success('Стадия добавлена');
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const stageBasicsCard = (
    <div className="rounded-2xl bg-white ring-1 ring-black/[0.08] shadow-sm p-5 space-y-5">
      <div>
        <label htmlFor="stage-name" className={labelClass}>
          Название
        </label>
        <input
          id="stage-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Квалификация, В работе, Оплата…"
          className={inputClass}
          autoFocus
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      <div>
        <span className={labelClass}>Цвет</span>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              className={`w-10 h-10 rounded-2xl border-2 transition-all ${
                form.color === c
                  ? 'border-neutral-900 scale-[1.06] shadow-md ring-2 ring-neutral-900/20'
                  : 'border-transparent hover:border-neutral-300 ring-1 ring-black/[0.06]'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-50 ring-1 ring-black/[0.06] p-4 space-y-3">
        <label className="flex items-center gap-3 text-[14px] cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_final}
            onChange={(e) => setForm((f) => ({ ...f, is_final: e.target.checked }))}
            className="rounded-md border-neutral-300 size-4 text-neutral-900 focus:ring-violet-500/30"
          />
          <span className="font-medium text-neutral-800">Финальная стадия</span>
        </label>
        {form.is_final && (
          <label className="flex items-center gap-3 text-[14px] cursor-pointer pl-px">
            <input
              type="checkbox"
              checked={form.auto_close}
              onChange={(e) => setForm((f) => ({ ...f, auto_close: e.target.checked }))}
              className="rounded-md border-neutral-300 size-4 text-neutral-900 focus:ring-violet-500/30"
            />
            <span className="text-neutral-600">Автозакрытие при переходе</span>
          </label>
        )}
      </div>
    </div>
  );

  const conditionCard = (
    <div className="rounded-2xl bg-white ring-1 ring-black/[0.08] shadow-sm p-5">
      <label className={labelClass}>Условие автоперехода</label>
      <ConditionBuilder
        value={form.transition_condition}
        onChange={handleConditionChange}
        fields={fields}
        stages={stages}
      />
    </div>
  );

  const pingsBlock =
    showPings && stage ? (
      <div className="rounded-2xl bg-white ring-1 ring-black/[0.08] shadow-sm p-5 min-h-0 lg:max-h-[min(72vh,calc(100vh-12rem))] lg:overflow-y-auto">
        <PingRulesSection companyId={companyId} stageId={stage.id} onRulesChange={() => {}} />
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4">
      <div
        className={`bg-white rounded-2xl shadow-[0_25px_80px_-12px_rgba(0,0,0,0.18)] w-full ring-1 ring-black/[0.05] max-h-[min(92vh,900px)] flex flex-col ${
          showPings ? 'max-w-4xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
          <h3 className="text-base font-semibold tracking-tight text-neutral-900">
            {stage ? 'Редактировать стадию' : 'Новая стадия'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {showPings ? (
            <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              <div className="flex flex-col gap-6 min-w-0 lg:order-1 order-2">
                {stageBasicsCard}
                {conditionCard}
              </div>
              <div className="lg:sticky lg:top-0 lg:self-start min-w-0 lg:order-2 order-1 mb-6 lg:mb-0">
                {pingsBlock}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {stageBasicsCard}
              {conditionCard}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-neutral-100 flex-shrink-0 bg-white/95 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-11 rounded-2xl text-[14px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200/90 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 min-h-11 rounded-2xl text-[14px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-45 transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} strokeWidth={2} />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
