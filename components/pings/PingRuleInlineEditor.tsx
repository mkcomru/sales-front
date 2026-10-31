import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Minus, Paperclip, Plus, X } from 'lucide-react';
import { detectAttachmentType } from '../chat/attachmentTypes';
import { artifactsService } from '../../services/artifacts';
import { pingsService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { extractApiErrorMessage } from '../../utils/errors';
import type { AttachmentDescriptor, PingRule, PingContentType } from '../../types/api';
import { MAX_PING_ATTACHMENTS } from '../../types/api';

const DURATION_PRESETS: ReadonlyArray<{ label: string; seconds: number }> = [
  { label: '5 мин', seconds: 300 },
  { label: '15 мин', seconds: 900 },
  { label: '30 мин', seconds: 1800 },
  { label: '1 ч', seconds: 3600 },
  { label: '3 ч', seconds: 10800 },
  { label: '6 ч', seconds: 21600 },
  { label: '12 ч', seconds: 43200 },
  { label: '1 д', seconds: 86400 },
  { label: '2 д', seconds: 172800 },
  { label: '3 д', seconds: 259200 },
  { label: '7 д', seconds: 604800 },
];

const CUSTOM_UNITS: ReadonlyArray<{ mult: number; short: string }> = [
  { mult: 1, short: 'сек' },
  { mult: 60, short: 'мин' },
  { mult: 3600, short: 'ч' },
  { mult: 86400, short: 'д' },
];

export interface PingRuleInlineEditorProps {
  companyId: number;
  stageId: number;
  mode: 'create' | 'edit';
  rule: PingRule | null;
  createPosition: number;
  chainStep: number;
  /** Delays already used by other rules on this stage (exclude current rule when editing). */
  takenDelaySeconds: ReadonlySet<number>;
  onCancel: () => void;
  onSaved: () => void;
}

function matchPreset(seconds: number): number | null {
  const i = DURATION_PRESETS.findIndex((p) => p.seconds === seconds);
  return i >= 0 ? i : null;
}

function customFromSeconds(seconds: number): { amount: number; mult: number } {
  for (const u of [...CUSTOM_UNITS].sort((a, b) => b.mult - a.mult)) {
    if (seconds >= u.mult && seconds % u.mult === 0) {
      return { amount: Math.max(1, seconds / u.mult), mult: u.mult };
    }
  }
  return { amount: Math.max(1, seconds), mult: 1 };
}

interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

function SegmentedRow<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-neutral-100/90 ring-1 ring-black/[0.04]">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
          className={[
            'min-h-[2.25rem] px-3 rounded-xl text-[13px] font-semibold transition-all duration-200',
            opt.disabled
              ? 'text-neutral-300 cursor-not-allowed'
              : value === opt.value
                ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.06]'
                : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/60',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export const PingRuleInlineEditor: React.FC<PingRuleInlineEditorProps> = ({
  companyId,
  stageId,
  mode,
  rule,
  createPosition,
  chainStep,
  takenDelaySeconds,
  onCancel,
  onSaved,
}) => {
  const toast = useToast();
  const isEdit = mode === 'edit' && rule !== null;

  const initialSeconds = isEdit ? rule.delay_seconds : 3600;
  const presetIdx = matchPreset(initialSeconds);
  const [durationPresetIdx, setDurationPresetIdx] = useState<number | null>(presetIdx);
  const [customAmount, setCustomAmount] = useState(() =>
    presetIdx === null ? customFromSeconds(initialSeconds).amount : 1
  );
  const [customMult, setCustomMult] = useState(() =>
    presetIdx === null ? customFromSeconds(initialSeconds).mult : 3600
  );
  const [content_type, setContentType] = useState<PingContentType>(
    isEdit ? rule.content_type : 'ai_generated'
  );
  const [static_content, setStaticContent] = useState(
    isEdit ? (rule.static_content ?? '') : ''
  );
  const [prompt_override, setPromptOverride] = useState(
    isEdit ? (rule.prompt_override ?? '') : ''
  );
  const [attachments, setAttachments] = useState<AttachmentDescriptor[]>(() =>
    isEdit && rule ? [...(rule.attachments ?? [])] : []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit && rule) {
      setAttachments([...(rule.attachments ?? [])]);
    } else {
      setAttachments([]);
    }
  }, [isEdit, rule?.id]);

  const attachmentSlotsLeft = MAX_PING_ATTACHMENTS - attachments.length;

  const delaySeconds = useMemo(() => {
    if (durationPresetIdx !== null) {
      return DURATION_PRESETS[durationPresetIdx].seconds;
    }
    return Math.max(1, customAmount * customMult);
  }, [durationPresetIdx, customAmount, customMult]);

  const showCustomDuration = durationPresetIdx === null;
  const delayTaken = takenDelaySeconds.has(delaySeconds);

  const handleAttachmentFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (!files.length) return;
    if (attachmentSlotsLeft <= 0) {
      toast.error(`Не больше ${MAX_PING_ATTACHMENTS} вложений в одном правиле`);
      return;
    }
    setIsUploadingAttachments(true);
    try {
      const slice = files.slice(0, attachmentSlotsLeft);
      const uploaded = await Promise.all(
        slice.map(async (file) => {
          const type = detectAttachmentType(file);
          const { artifact_id } = await artifactsService.upload(companyId, file, type);
          return {
            artifact_id,
            type,
            mime_type: file.type || 'application/octet-stream',
          } satisfies AttachmentDescriptor;
        })
      );
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const handleSave = async () => {
    if (content_type === 'static' && !static_content.trim()) {
      toast.error('Укажите текст сообщения для статического пинга');
      return;
    }
    if (takenDelaySeconds.has(delaySeconds)) {
      toast.error('На этой стадии уже есть напоминание с такой же паузой — выберите другое время');
      return;
    }

    try {
      setIsSaving(true);
      if (isEdit && rule) {
        await pingsService.update(companyId, rule.id, {
          delay_seconds: delaySeconds,
          content_type,
          static_content: content_type === 'static' ? static_content : null,
          prompt_override:
            content_type === 'ai_generated' ? prompt_override || null : null,
          attachments,
          is_active: true,
        });
        toast.success('Сохранено');
      } else {
        await pingsService.create(companyId, stageId, {
          position: createPosition,
          delay_seconds: delaySeconds,
          content_type,
          static_content: content_type === 'static' ? static_content : null,
          prompt_override:
            content_type === 'ai_generated' ? prompt_override || null : null,
          attachments,
          is_active: true,
        });
        toast.success('Правило добавлено');
      }
      onSaved();
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const intro = isEdit ? (
    <>
      Шаг <span className="font-semibold text-neutral-900">{chainStep}</span> в списке (по паузе) —
      задержка и текст этого напоминания от последнего сообщения клиента.
    </>
  ) : chainStep <= 1 ? (
    <>
      Первое напоминание: уйдёт после паузы ниже от последнего сообщения клиента на этой стадии.
    </>
  ) : (
    <>
      Добавление напоминания; пауза должна отличаться от уже заданных на этой стадии.
    </>
  );

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/[0.08] shadow-sm p-5 space-y-5">
      <p className="text-[13px] text-neutral-600 leading-snug">{intro}</p>

      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
          Через сколько напомнить
        </span>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {DURATION_PRESETS.map((p, i) => {
            const taken = takenDelaySeconds.has(p.seconds);
            return (
              <button
                key={p.seconds}
                type="button"
                disabled={taken}
                onClick={() => setDurationPresetIdx(i)}
                className={[
                  'px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200',
                  taken
                    ? 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
                    : durationPresetIdx === i
                      ? 'bg-neutral-900 text-white shadow-md'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                ].join(' ')}
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              const base =
                durationPresetIdx !== null
                  ? DURATION_PRESETS[durationPresetIdx].seconds
                  : delaySeconds;
              const { amount, mult } = customFromSeconds(base);
              setCustomAmount(amount);
              setCustomMult(mult);
              setDurationPresetIdx(null);
            }}
            className={[
              'px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ring-1 ring-inset',
              showCustomDuration
                ? 'bg-violet-600 text-white ring-violet-600 shadow-md'
                : 'bg-white text-neutral-500 ring-neutral-200 hover:ring-neutral-300',
            ].join(' ')}
          >
            Своя
          </button>
        </div>

        {showCustomDuration && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 ring-1 ring-black/[0.06]">
            <button
              type="button"
              className="p-2 rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              disabled={customAmount <= 1}
              onClick={() => setCustomAmount((n) => Math.max(1, n - 1))}
            >
              <Minus size={16} strokeWidth={2.5} />
            </button>
            <span className="tabular-nums text-2xl font-semibold text-neutral-900 min-w-[2.5ch] text-center">
              {customAmount}
            </span>
            <button
              type="button"
              className="p-2 rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] text-neutral-600 hover:bg-neutral-50"
              onClick={() => setCustomAmount((n) => n + 1)}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
              <SegmentedRow
                options={CUSTOM_UNITS.map((u) => ({
                  value: u.mult,
                  label: u.short,
                }))}
                value={customMult}
                onChange={(mult) => setCustomMult(mult)}
              />
            </div>
          </div>
        )}
        {delayTaken && (
          <p className="text-[12px] text-red-600 mt-2">
            Эта пауза уже занята другим правилом на этой стадии.
          </p>
        )}
      </div>

      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
          Как отправить
        </span>
        <SegmentedRow<PingContentType>
          options={[
            { value: 'ai_generated', label: 'Через AI' },
            { value: 'static', label: 'Текст' },
          ]}
          value={content_type}
          onChange={(v) => {
            setContentType(v);
            if (v === 'ai_generated') setStaticContent('');
            else setPromptOverride('');
          }}
        />
      </div>

      {content_type === 'ai_generated' && (
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Инструкция для AI{' '}
            <span className="font-normal text-neutral-500 normal-case">· опционально</span>
          </label>
          <textarea
            value={prompt_override}
            onChange={(e) => setPromptOverride(e.target.value)}
            placeholder="Например: мягко напомни про оффер, коротко"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl bg-neutral-50 ring-1 ring-black/[0.06] text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:bg-white resize-y min-h-[5.5rem]"
          />
        </div>
      )}

      {content_type === 'static' && (
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Текст клиенту
          </label>
          <textarea
            value={static_content}
            onChange={(e) => setStaticContent(e.target.value)}
            placeholder="Напоминание отправится как есть"
            rows={4}
            className="w-full px-4 py-3 rounded-2xl bg-neutral-50 ring-1 ring-black/[0.06] text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:bg-white resize-y min-h-[7rem]"
          />
        </div>
      )}

      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
          Вложения · опционально
        </span>
        <p className="text-[12px] text-neutral-500 mb-2">
          До {MAX_PING_ATTACHMENTS} файлов; уйдут вместе с напоминанием (как в обычном исходящем).
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleAttachmentFiles}
        />
        <button
          type="button"
          disabled={
            isSaving || isUploadingAttachments || attachmentSlotsLeft <= 0
          }
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200/90 disabled:opacity-45 transition-colors"
        >
          {isUploadingAttachments ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Paperclip size={16} strokeWidth={2.25} />
          )}
          Добавить файл
        </button>
        {attachments.length > 0 && (
          <ul className="mt-3 space-y-2">
            {attachments.map((a, idx) => (
              <li
                key={`${a.artifact_id}-${idx}`}
                className="flex gap-2 items-start p-3 rounded-2xl bg-neutral-50 ring-1 ring-black/[0.06]"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-[12px] font-medium text-neutral-800 truncate">
                    {a.type} · {a.mime_type}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500 truncate">{a.artifact_id}</div>
                  <input
                    type="text"
                    value={a.caption ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAttachments((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, caption: v || undefined } : x
                        )
                      );
                    }}
                    placeholder="Подпись (опционально)"
                    className="w-full px-3 py-2 rounded-xl bg-white ring-1 ring-black/[0.06] text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                  aria-label="Удалить вложение"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-11 rounded-2xl text-[14px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200/90 transition-colors"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || delayTaken}
          className="flex-1 min-h-11 rounded-2xl text-[14px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-45 transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
          {isSaving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить в цепочку'}
        </button>
      </div>
    </div>
  );
};
