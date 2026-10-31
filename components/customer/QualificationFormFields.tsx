import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { StageTemplate } from '../../types/api';
import type { CompanyMember } from '../../types';

export interface QualificationFormFieldsProps {
  stages: StageTemplate[];
  managers: CompanyMember[];
  currentStageId: string;
  currentAssigneeId: string;
  onUpdateStage?: (stageId: string) => void;
  onUpdateAssignee?: (managerId: string) => void;
}

export const QualificationFormFields: React.FC<QualificationFormFieldsProps> = ({
  stages,
  managers,
  currentStageId,
  currentAssigneeId,
  onUpdateStage,
  onUpdateAssignee,
}) => {
  if (!onUpdateStage && !onUpdateAssignee) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Квалификация</h4>

        {onUpdateStage && (
          <div className="group">
            <label className="text-[12px] text-gray-500 font-medium mb-1.5 block">Стадия сделки</label>
            <div className="relative w-full">
              <select
                value={currentStageId}
                onChange={(e) => onUpdateStage(e.target.value)}
                className="form-select bg-gray-50 hover:bg-white border-transparent hover:border-gray-200 pr-8 py-2 font-medium shadow-sm focus:ring-sky-100 focus:border-sky-200"
              >
                <option value="">Без стадии</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={String(stage.id)}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        )}

        {onUpdateAssignee && (
          <div className="group">
            <label className="text-[12px] text-gray-500 font-medium mb-1.5 block">Ответственный</label>
            <div className="relative w-full">
              <select
                value={currentAssigneeId}
                onChange={(e) => onUpdateAssignee(e.target.value)}
                className="form-select bg-gray-50 hover:bg-white border-transparent hover:border-gray-200 pr-8 py-2 font-medium shadow-sm focus:ring-sky-100 focus:border-sky-200"
              >
                <option value="">Не назначен</option>
                <option value="ai-agent">AI Agent</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={String(manager.id)}>
                    {manager.first_name || manager.email} {manager.last_name || ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="h-px bg-gray-100" />
    </>
  );
};
