import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Code2, Zap } from 'lucide-react';
import type { CompanyField, StageTemplate } from '../../types/api';
import type { BuilderGroup } from './types';
import { createEmptyGroup, createId } from './types';
import { jsonToBuilderTree, builderTreeToJson } from './serializer';
import { ConditionGroupEditor } from './ConditionGroupEditor';

interface ConditionBuilderProps {
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown> | null) => void;
  fields: CompanyField[];
  stages: StageTemplate[];
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  value,
  onChange,
  fields,
  stages,
}) => {
  const [tree, setTree] = useState<BuilderGroup | null>(null);
  const [rawMode, setRawMode] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [jsonExpanded, setJsonExpanded] = useState(false);

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      setTree(createEmptyGroup());
      setParseError(false);
      setRawMode(false);
      return;
    }

    const parsed = jsonToBuilderTree(value);
    if (parsed) {
      setTree(parsed);
      setParseError(false);
      setRawMode(false);
    } else {
      setTree(null);
      setParseError(true);
      setRawMode(true);
    }
    setRawJson(JSON.stringify(value, null, 2));
  }, []);

  const isAnyMode = useMemo(() => {
    if (!tree) return false;
    return (
      tree.children.length === 1 &&
      tree.children[0].type === 'rule' &&
      tree.children[0].field === '$any'
    );
  }, [tree]);

  const handleTreeChange = useCallback((updated: BuilderGroup) => {
    setTree(updated);
    const json = builderTreeToJson(updated);
    const isEmpty = Object.keys(json).length === 0;
    onChange(isEmpty ? null : json);
    setRawJson(JSON.stringify(isEmpty ? null : json, null, 2));
  }, [onChange]);

  const handleAnyToggle = useCallback((enabled: boolean) => {
    if (enabled) {
      const anyGroup: BuilderGroup = {
        id: createId(),
        type: 'group',
        logic: 'and',
        children: [{ id: createId(), type: 'rule', field: '$any', operator: '$eq', value: true }],
      };
      handleTreeChange(anyGroup);
    } else {
      handleTreeChange(createEmptyGroup());
    }
  }, [handleTreeChange]);

  const handleRawSave = useCallback(() => {
    try {
      const parsed = rawJson.trim() ? JSON.parse(rawJson) : null;
      if (parsed !== null && typeof parsed !== 'object') return;
      onChange(parsed);
      if (parsed) {
        const newTree = jsonToBuilderTree(parsed as Record<string, unknown>);
        if (newTree) {
          setTree(newTree);
          setParseError(false);
          setRawMode(false);
        }
      } else {
        setTree(createEmptyGroup());
        setParseError(false);
        setRawMode(false);
      }
    } catch {
      // Invalid JSON
    }
  }, [rawJson, onChange]);

  const handleSwitchToRaw = useCallback(() => {
    setRawMode(true);
    if (tree) {
      const json = builderTreeToJson(tree);
      setRawJson(JSON.stringify(Object.keys(json).length > 0 ? json : null, null, 2));
    }
  }, [tree]);

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleAnyToggle(!isAnyMode)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAnyToggle(!isAnyMode);
          }
        }}
        className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all ring-1 ${
          isAnyMode
            ? 'bg-violet-50 ring-violet-500/25 shadow-sm'
            : 'bg-neutral-50/80 ring-black/[0.06] hover:ring-black/[0.1]'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            isAnyMode ? 'bg-violet-600 text-white' : 'bg-neutral-200 text-neutral-500'
          }`}
        >
          <Zap size={14} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-neutral-800">Любой заказ</div>
          <div className="text-[10px] text-neutral-500 leading-tight">
            Переход без условий на поля
          </div>
        </div>
      </div>

      {/* Visual builder */}
      {!isAnyMode && !rawMode && tree && (
        <ConditionGroupEditor
          group={tree}
          fields={fields}
          stages={stages}
          depth={1}
          onChange={handleTreeChange}
        />
      )}

      {/* Raw JSON mode */}
      {rawMode && (
        <div className="space-y-2">
          {parseError && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 ring-1 ring-amber-200/60 rounded-xl text-[11px] text-amber-900">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <div className="font-semibold">Сложное условие</div>
                <div className="text-[10px] text-amber-800/90 mt-0.5 leading-snug">
                  Редактируйте JSON ниже или упростите условие.
                </div>
              </div>
            </div>
          )}
          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-xl bg-neutral-50 ring-1 ring-black/[0.06] font-mono text-[11px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:bg-white resize-y"
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRawSave}
              className="min-h-9 px-4 text-[12px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Применить
            </button>
            {!parseError && (
              <button
                type="button"
                onClick={() => setRawMode(false)}
                className="min-h-9 px-4 text-[12px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200/90 rounded-xl transition-colors"
              >
                К конструктору
              </button>
            )}
          </div>
        </div>
      )}

      {/* JSON debug dropdown */}
      {!rawMode && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setJsonExpanded(!jsonExpanded)}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {jsonExpanded ? <ChevronDown size={12} strokeWidth={2} /> : <ChevronRight size={12} strokeWidth={2} />}
            <Code2 size={12} strokeWidth={2} />
            JSON
          </button>
          {jsonExpanded && (
            <div className="mt-1.5 space-y-1.5">
              <pre className="p-2.5 bg-neutral-50 ring-1 ring-black/[0.05] rounded-xl text-[10px] font-mono text-neutral-500 overflow-x-auto max-h-[120px] overflow-y-auto leading-relaxed">
                {rawJson || 'null'}
              </pre>
              <button
                type="button"
                onClick={handleSwitchToRaw}
                className="text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
              >
                Редактировать вручную →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
