import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { formsService } from '../services';
import type { PublicFormResponse, PublicField, CaptureSubmitRequest } from '../types/api';

export const PublicFormPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState<PublicFormResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) {
      setError('Ссылка на форму недействительна');
      setIsLoading(false);
      return;
    }

    const loadForm = async () => {
      try {
        setIsLoading(true);
        const formData = await formsService.getPublicForm(publicId);
        setForm(formData);

        const initialValues: Record<string, string> = {};
        formData.fields.forEach(field => {
          initialValues[field.name] = '';
        });
        setFieldValues(initialValues);
      } catch (e) {
        setError('Форма не найдена или деактивирована');
      } finally {
        setIsLoading(false);
      }
    };

    loadForm();
  }, [publicId]);

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId || !form) return;

    const missingRequired = form.fields
      .filter(f => f.required && !fieldValues[f.name]?.trim())
      .map(f => f.display_name || f.name);

    if (missingRequired.length > 0) {
      setSubmitError(`Заполните обязательные поля: ${missingRequired.join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const utm: Record<string, string> = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
        const value = searchParams.get(key);
        if (value) utm[key.replace('utm_', '')] = value;
      });

      const payload: CaptureSubmitRequest = {
        fields: fieldValues,
        utm: Object.keys(utm).length > 0 ? utm : undefined,
      };

      await formsService.submitPublicForm(publicId, payload);
      setSubmitSuccess(true);
    } catch (e) {
      setSubmitError('Ошибка при отправке формы. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-shell">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="page-shell">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Форма недоступна</h1>
          <p className="text-gray-500">{error || 'Форма не найдена'}</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="page-shell">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Заявка отправлена!</h1>
          <p className="text-gray-500">Мы свяжемся с вами в ближайшее время.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-5">
            <h1 className="text-xl font-bold text-white">{form.name}</h1>
            <p className="text-indigo-200 text-sm mt-1">{form.company_name}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {form.fields.map(field => (
              <FormFieldInput
                key={field.id}
                field={field}
                value={fieldValues[field.name] || ''}
                onChange={value => handleFieldChange(field.name, value)}
              />
            ))}

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-accent w-full py-3"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              Отправить
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by Pulse CRM
        </p>
      </div>
    </div>
  );
};

interface FormFieldInputProps {
  field: PublicField;
  value: string;
  onChange: (value: string) => void;
}

const FormFieldInput: React.FC<FormFieldInputProps> = ({ field, value, onChange }) => {
  const label = field.display_name || field.name;
  const inputId = `field-${field.id}`;

  const inputClass = 'form-input';
  const selectClass = 'form-select';

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.question && (
        <p className="text-xs text-gray-500 mb-2">{field.question}</p>
      )}

      {field.answer_type === 'enum' && field.options.length > 0 ? (
        <select
          id={inputId}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={field.required}
          className={selectClass}
        >
          <option value="">Выберите...</option>
          {field.options.map(opt => (
            <option key={opt.id} value={opt.value}>
              {opt.value}
            </option>
          ))}
        </select>
      ) : field.answer_type === 'boolean' ? (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={inputId}
              value="true"
              checked={value === 'true'}
              onChange={() => onChange('true')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">Да</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={inputId}
              value="false"
              checked={value === 'false'}
              onChange={() => onChange('false')}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">Нет</span>
          </label>
        </div>
      ) : field.answer_type === 'number' ? (
        <input
          id={inputId}
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          required={field.required}
          className={inputClass}
          placeholder={`Введите ${label.toLowerCase()}`}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          required={field.required}
          className={inputClass}
          placeholder={`Введите ${label.toLowerCase()}`}
        />
      )}
    </div>
  );
};
