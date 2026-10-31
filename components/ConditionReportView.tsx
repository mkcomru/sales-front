import React from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { ConditionNodeApi, ConditionGroupApi, ConditionClauseApi } from '../types/api';

interface ConditionReportViewProps {
  root: ConditionGroupApi;
}

const LOGIC_LABELS: Record<string, string> = {
  and: 'Все условия (AND)',
  or: 'Любое из (OR)',
  not: 'НЕ (NOT)',
};

export const ConditionReportView: React.FC<ConditionReportViewProps> = ({ root }) => {
  return (
    <div className="space-y-1">
      <GroupNode group={root} depth={0} />
    </div>
  );
};

const GroupNode: React.FC<{ group: ConditionGroupApi; depth: number }> = ({ group, depth }) => {
  const [expanded, setExpanded] = React.useState(true);
  const label = LOGIC_LABELS[group.logic] ?? group.logic;

  return (
    <div className={depth > 0 ? 'ml-4 border-l-2 border-gray-100 pl-3' : ''}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-700 transition-colors mb-1"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <ResultIcon result={group.result} size={13} />
        <span>{label}</span>
      </button>

      {expanded && (
        <div className="space-y-1">
          {group.children.map((child, i) => (
            <NodeView key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const NodeView: React.FC<{ node: ConditionNodeApi; depth: number }> = ({ node, depth }) => {
  if (node.type === 'group') return <GroupNode group={node} depth={depth} />;
  return <ClauseNode clause={node} />;
};

const ClauseNode: React.FC<{ clause: ConditionClauseApi }> = ({ clause }) => {
  const actualDisplay = formatActual(clause.actual);

  return (
    <div className="flex items-start gap-2 ml-4 py-0.5">
      <ResultIcon result={clause.result} size={14} />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] text-gray-700">{clause.description}</span>
        {actualDisplay && (
          <span className="ml-2 text-[11px] text-gray-400">
            ({actualDisplay})
          </span>
        )}
      </div>
    </div>
  );
};

const ResultIcon: React.FC<{ result: boolean; size?: number }> = ({ result, size = 14 }) => {
  if (result) return <CheckCircle2 size={size} className="text-green-500 flex-shrink-0 mt-0.5" />;
  return <XCircle size={size} className="text-red-400 flex-shrink-0 mt-0.5" />;
};

function formatActual(actual: unknown): string | null {
  if (actual === null || actual === undefined) return 'не заполнено';
  if (typeof actual === 'boolean') return actual ? 'да' : 'нет';
  if (typeof actual === 'string') return actual === '' ? 'пусто' : `"${actual}"`;
  if (typeof actual === 'number') return String(actual);
  return null;
}
