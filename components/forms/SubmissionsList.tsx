import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import type { FormSubmission, CompanyField } from '../../types/api';

interface SubmissionsListProps {
  submissions: FormSubmission[];
  fields: CompanyField[];
  onClose: () => void;
}

export const SubmissionsList: React.FC<SubmissionsListProps> = ({ submissions, fields, onClose }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (submissions.length === 0) return null;

  const getFieldName = (fieldId: string): string => {
    const id = parseInt(fieldId, 10);
    const field = fields.find(f => f.id === id);
    return field?.display_name || field?.name || `ID: ${fieldId}`;
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-bold text-gray-400 uppercase">
          Последние заявки ({submissions.length})
        </label>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {submissions.map(sub => {
          const isExpanded = expandedId === sub.id;
          return (
            <div key={sub.id} className="bg-gray-50 rounded-lg text-[12px] overflow-hidden">
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              >
                <div className="space-y-1">
                  <div className="flex gap-4 text-gray-500">
                    <span>ID: {sub.id}</span>
                    <span>{new Date(sub.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-700">
                    Customer: {sub.customer_id ?? '-'} | Order: {sub.order_id ?? '-'}
                  </div>
                </div>
                <button className="p-1 text-gray-400">
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-200">
                  <div className="pt-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                      Данные формы
                    </label>
                    <div className="space-y-1">
                      {Object.entries(sub.raw_fields).map(([fieldId, value]) => (
                        <div key={fieldId} className="flex gap-2">
                          <span className="text-gray-500 min-w-[120px]">{getFieldName(fieldId)}:</span>
                          <span className="text-gray-800 font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {sub.utm_data && Object.keys(sub.utm_data).length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                        UTM метки
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(sub.utm_data).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]"
                          >
                            {key}={value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {sub.ip_address && (
                    <div className="text-[11px] text-gray-400">IP: {sub.ip_address}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
