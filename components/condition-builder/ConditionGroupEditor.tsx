import React, { useCallback } from 'react';
import { Plus, Trash2, ListFilter } from 'lucide-react';
import type { CompanyField, StageTemplate } from '../../types/api';
import type { BuilderGroup, BuilderNode } from './types';
import { createEmptyRule, createEmptyGroup, MAX_NESTING_DEPTH } from './types';
import { ConditionRuleRow } from './ConditionRuleRow';

interface ConditionGroupEditorProps {
  group: BuilderGroup;
  fields: CompanyField[];
  stages: StageTemplate[];
  depth: number;
  onChange: (updated: BuilderGroup) => void;
  onRemove?: () => void;
}

export const ConditionGroupEditor: React.FC<ConditionGroupEditorProps> = ({
  group,
  fields,
  stages,
  depth,
  onChange,
  onRemove,
}) => {
  const canNest = depth < MAX_NESTING_DEPTH;

  const updateChild = useCallback(
    (index: number, updated: BuilderNode) => {
      const newChildren = [...group.children];
      newChildren[index] = updated;
      onChange({ ...group, children: newChildren });
    },
    [group, onChange]
  );

  const removeChild = useCallback(
    (index: number) => {
      onChange({ ...group, children: group.children.filter((_, i) => i !== index) });
    },
    [group, onChange]
  );

  const convertChildToGroup = useCallback(
    (index: number) => {
      const subLogic = group.logic === 'and' ? 'or' : 'and';
      const newChildren = [...group.children];
      newChildren[index] = createEmptyGroup(subLogic);
      onChange({ ...group, children: newChildren });
    },
    [group, onChange]
  );

  const addRule = useCallback(() => {
    onChange({ ...group, children: [...group.children, createEmptyRule()] });
  }, [group, onChange]);

  const setLogic = useCallback(
    (logic: 'and' | 'or') => {
      onChange({ ...group, logic });
    },
    [group, onChange]
  );

  const depthShell =
    depth === 1
      ? 'ring-black/[0.06] bg-white'
      : depth === 2
        ? 'ring-violet-500/15 bg-violet-50/40'
        : 'ring-amber-500/15 bg-amber-50/40';

  return (
    <div className={`rounded-xl ring-1 overflow-hidden ${depthShell}`}>
      <div className="bg-neutral-50/95 px-2.5 py-1.5 flex flex-wrap items-center gap-2 border-b border-black/[0.04]">
        <ListFilter size={12} className="text-neutral-400 flex-shrink-0" strokeWidth={2} />

        <div className="inline-flex gap-0.5 p-0.5 rounded-xl bg-neutral-100/90 ring-1 ring-black/[0.04]">
          <button
            type="button"
            onClick={() => setLogic('and')}
            className={`min-h-[1.75rem] px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
              group.logic === 'and'
                ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.06]'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            И
          </button>
          <button
            type="button"
            onClick={() => setLogic('or')}
            className={`min-h-[1.75rem] px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
              group.logic === 'or'
                ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.06]'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            ИЛИ
          </button>
        </div>

        <span className="text-[10px] text-neutral-500">
          {group.logic === 'and' ? 'все условия' : 'достаточно одного'}
        </span>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto p-1.5 text-neutral-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Удалить группу"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="p-2 space-y-1.5">
        {group.children.length === 0 && (
          <div className="py-4 text-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60">
            <p className="text-[11px] font-medium text-neutral-500">Нет условий</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">+ Условие</p>
          </div>
        )}

        {group.children.map((child, i) => (
          <React.Fragment key={child.id}>
            {i > 0 && (
              <div className="flex items-center gap-2 px-1 -my-px">
                <div className="flex-1 h-px bg-neutral-200/80" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  {group.logic === 'and' ? 'и' : 'или'}
                </span>
                <div className="flex-1 h-px bg-neutral-200/80" />
              </div>
            )}
            {child.type === 'rule' ? (
              <ConditionRuleRow
                rule={child}
                fields={fields}
                stages={stages}
                canNest={canNest}
                onChange={(updated) => updateChild(i, updated)}
                onConvertToGroup={() => convertChildToGroup(i)}
                onRemove={() => removeChild(i)}
              />
            ) : (
              <ConditionGroupEditor
                group={child}
                fields={fields}
                stages={stages}
                depth={depth + 1}
                onChange={(updated) => updateChild(i, updated)}
                onRemove={() => removeChild(i)}
              />
            )}
          </React.Fragment>
        ))}

        <div className="pt-0.5">
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            <Plus size={13} strokeWidth={2.5} /> Условие
          </button>
        </div>
      </div>
    </div>
  );
};
