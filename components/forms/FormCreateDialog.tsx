import React from 'react';
import { X, Loader2, CheckCircle, Save } from 'lucide-react';
import type { CompanyField, FormTemplate } from '../../types/api';

interface FormDialogProps {
  fields: CompanyField[];
  formName: string;
  contactFieldId: number | null;
  selectedFieldIds: number[];
  isSubmitting: boolean;
  editingForm?: FormTemplate | null;
  onNameChange: (name: string) => void;
  onContactFieldChange: (id: number | null) => void;
  onToggleField: (id: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const FormCreateDialog: React.FC<FormDialogProps> = ({
  fields,
  formName,
  contactFieldId,
  selectedFieldIds,
  isSubmitting,
  editingForm,
  onNameChange,
  onContactFieldChange,
  onToggleField,
  onSubmit,
  onCancel,
}) => {
  const isEditing = !!editingForm;

  return (
    <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-5 animate-in fade-in slide-in-from-top-2">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-[14px] font-bold text-gray-900">
          {isEditing ? `Редактировать: ${editingForm.name}` : 'Новая форма'}
        </h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="form-label">Название формы</label>
          <input
            value={formName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Заявка с сайта"
            className="form-input"
          />
        </div>

        <div className="space-y-1">
          <label className="form-label">
            Контактное поле (обязательно)
          </label>
          <select
            value={contactFieldId ?? ''}
            onChange={e => onContactFieldChange(Number(e.target.value) || null)}
            className="form-select"
          >
            <option value="">Выберите поле...</option>
            {fields.map(f => (
              <option key={f.id} value={f.id}>
                {f.display_name || f.name} ({f.type}) — ID: {f.id}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400">
            По этому полю идентифицируется клиент (email, телефон). В API используйте ID поля.
          </p>
        </div>

        <div className="space-y-1">
          <label className="form-label">Дополнительные поля</label>
          <div className="flex flex-wrap gap-2">
            {fields
              .filter(f => f.id !== contactFieldId)
              .map(f => (
                <button
                  key={f.id}
                  onClick={() => onToggleField(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${
                    selectedFieldIds.includes(f.id)
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.display_name || f.name}
                  <span className="ml-1 text-[10px] opacity-60">#{f.id}</span>
                </button>
              ))}
          </div>
          {fields.filter(f => f.id !== contactFieldId).length === 0 && (
            <p className="text-[11px] text-gray-400 italic">Нет дополнительных полей</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="btn-ghost"
        >
          Отмена
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="btn-accent"
        >
          {isSubmitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isEditing ? (
            <Save size={14} />
          ) : (
            <CheckCircle size={14} />
          )}
          {isEditing ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </div>
  );
};
