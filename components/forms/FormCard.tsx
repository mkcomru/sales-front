import React, { useState, useCallback } from 'react';
import { FileText, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import type { FormTemplate, CompanyField, FormSubmission } from '../../types/api';
import { formsService } from '../../services';
import { ApiKeyDisplay } from './ApiKeyDisplay';
import { CodeSnippet } from './CodeSnippet';
import { SubmissionsList } from './SubmissionsList';

interface FormCardProps {
  form: FormTemplate;
  fields: CompanyField[];
  companyId: number;
  onUpdate: (form: FormTemplate) => void;
  onDelete: (form: FormTemplate) => void;
  onEdit: (form: FormTemplate) => void;
}

export const FormCard: React.FC<FormCardProps> = ({
  form,
  fields,
  companyId,
  onUpdate,
  onDelete,
  onEdit,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);

  const getFieldById = useCallback((id: number) => fields.find(f => f.id === id), [fields]);

  const handleToggleEnabled = async () => {
    try {
      const updated = await formsService.update(companyId, form.id, { enabled: !form.enabled });
      onUpdate(updated);
    } catch {
      alert('Не удалось изменить статус');
    }
  };

  const handleDelete = () => {
    if (!confirm(`Удалить форму "${form.name}"?`)) return;
    onDelete(form);
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Перегенерировать API ключ? Старый ключ перестанет работать.')) return;
    try {
      setIsRegenerating(true);
      const newKey = await formsService.regenerateKey(companyId, form.id);
      setApiKey(newKey);
      onUpdate({ ...form, has_api_key: true });
    } catch {
      alert('Не удалось перегенерировать ключ');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleLoadSubmissions = async () => {
    try {
      setIsLoadingSubmissions(true);
      const result = await formsService.listSubmissions(companyId, form.id);
      setSubmissions(result.items);
      setShowSubmissions(true);
    } catch {
      alert('Не удалось загрузить заявки');
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-500">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-bold text-gray-900">{form.name}</h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  form.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {form.enabled ? 'Active' : 'Disabled'}
              </span>
              {form.has_api_key && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                  API Key
                </span>
              )}
            </div>
            <div className="text-[12px] text-gray-400 mt-0.5">
              Полей: {form.template_fields.length + 1} • ID: {form.id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Подробнее"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => onEdit(form)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Редактировать"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleToggleEnabled}
            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title={form.enabled ? 'Отключить' : 'Включить'}
          >
            {form.enabled ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Удалить"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-2 block">
                Контактное поле
              </label>
              <div className="text-[13px] text-gray-700">
                {getFieldById(form.contact_field_id)?.display_name ||
                  getFieldById(form.contact_field_id)?.name ||
                  `ID: ${form.contact_field_id}`}
                <span className="ml-1 text-[11px] text-gray-400">#{form.contact_field_id}</span>
              </div>
            </div>
            <div>
              <label className="form-label mb-2 block">
                Поля формы
              </label>
              <div className="flex flex-wrap gap-1">
                {form.template_fields.map(tf => {
                  const field = getFieldById(tf.field_id);
                  return (
                    <span
                      key={tf.id}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]"
                    >
                      {field?.display_name || field?.name || `ID: ${tf.field_id}`}
                      <span className="ml-1 opacity-60">#{tf.field_id}</span>
                    </span>
                  );
                })}
                {form.template_fields.length === 0 && (
                  <span className="text-[12px] text-gray-400 italic">Только контактное поле</span>
                )}
              </div>
            </div>
          </div>

          <ApiKeyDisplay
            publicId={form.public_id}
            apiKey={apiKey}
            hasApiKey={form.has_api_key}
            isRegenerating={isRegenerating}
            isLoadingSubmissions={isLoadingSubmissions}
            onRegenerate={handleRegenerateKey}
            onLoadSubmissions={handleLoadSubmissions}
          />

          <CodeSnippet form={form} fields={fields} companyId={companyId} />

          {showSubmissions && (
            <SubmissionsList
              submissions={submissions}
              fields={fields}
              onClose={() => setShowSubmissions(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};
