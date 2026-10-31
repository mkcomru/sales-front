import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, AlertTriangle, Plus } from 'lucide-react';
import { formsService, companiesService } from '../services';
import type { FormTemplate, FormTemplateCreate, FormTemplatePatch, CompanyField } from '../types/api';
import { isAxiosError } from 'axios';
import { useToast } from '../hooks/useToast';
import { extractApiErrorMessage } from '../utils/errors';
import { FormCard, FormCreateDialog } from './forms';

interface FormsSettingsProps {
  companyId: number;
}

export const FormsSettings: React.FC<FormsSettingsProps> = ({ companyId }) => {
  const toast = useToast();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [fields, setFields] = useState<CompanyField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [contactFieldId, setContactFieldId] = useState<number | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setAccessError(null);
    try {
      setIsLoading(true);
      const [formList, fieldList] = await Promise.all([
        formsService.list(companyId),
        companiesService.getFields(companyId),
      ]);
      setForms(formList);
      setFields(fieldList);
    } catch (e) {
      if (isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        setAccessError(`Ошибка доступа (${e.response.status}).`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetDialog = useCallback(() => {
    setFormName('');
    setContactFieldId(null);
    setSelectedFieldIds([]);
    setEditingForm(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetDialog();
    setIsDialogOpen(true);
  }, [resetDialog]);

  const openEditDialog = useCallback((form: FormTemplate) => {
    setEditingForm(form);
    setFormName(form.name);
    setContactFieldId(form.contact_field_id);
    setSelectedFieldIds(form.template_fields.map(tf => tf.field_id));
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    resetDialog();
  }, [resetDialog]);

  const handleSubmit = async () => {
    if (!formName || !contactFieldId) {
      toast.warning('Заполните название и выберите контактное поле');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingForm) {
        const payload: FormTemplatePatch = {
          name: formName,
          contact_field_id: contactFieldId,
          template_fields: selectedFieldIds.map((id, idx) => ({ field_id: id, position: idx })),
        };
        const updated = await formsService.update(companyId, editingForm.id, payload);
        setForms(prev => prev.map(f => (f.id === updated.id ? updated : f)));
      } else {
        const payload: FormTemplateCreate = {
          name: formName,
          contact_field_id: contactFieldId,
          template_fields: selectedFieldIds.map((id, idx) => ({ field_id: id, position: idx })),
        };
        await formsService.create(companyId, payload);
        await fetchData();
      }

      closeDialog();
    } catch (e) {
      toast.error(`Ошибка: ${extractApiErrorMessage(e)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = useCallback((updated: FormTemplate) => {
    setForms(prev => prev.map(f => (f.id === updated.id ? updated : f)));
  }, []);

  const handleDelete = useCallback(
    async (form: FormTemplate) => {
      try {
        await formsService.delete(companyId, form.id);
        setForms(prev => prev.filter(f => f.id !== form.id));
      } catch (e) {
        toast.error(`Не удалось удалить форму: ${extractApiErrorMessage(e)}`);
      }
    },
    [companyId]
  );

  const handleToggleField = useCallback((fieldId: number) => {
    setSelectedFieldIds(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  }, []);

  if (isLoading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="w-full bg-red-50 border border-red-100 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2">
        <AlertTriangle className="text-red-500" size={24} />
        <p className="text-red-600 text-[13px]">{accessError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900">Веб-формы ({forms.length})</h3>
          <p className="text-[12px] text-gray-500">Захват лидов с сайта через API</p>
        </div>
        {!isDialogOpen && (
          <button
            onClick={openCreateDialog}
            className="btn-primary"
          >
            <Plus size={14} /> Создать форму
          </button>
        )}
      </div>

      {isDialogOpen && (
        <FormCreateDialog
          fields={fields}
          formName={formName}
          contactFieldId={contactFieldId}
          selectedFieldIds={selectedFieldIds}
          isSubmitting={isSubmitting}
          editingForm={editingForm}
          onNameChange={setFormName}
          onContactFieldChange={setContactFieldId}
          onToggleField={handleToggleField}
          onSubmit={handleSubmit}
          onCancel={closeDialog}
        />
      )}

      <div className="grid grid-cols-1 gap-3">
        {forms.map(form => (
          <FormCard
            key={form.id}
            form={form}
            fields={fields}
            companyId={companyId}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onEdit={openEditDialog}
          />
        ))}

        {forms.length === 0 && !isDialogOpen && (
          <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <FileText size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-[13px]">Нет созданных форм</p>
            <button
              onClick={openCreateDialog}
              className="text-indigo-600 hover:underline text-[13px] mt-1 font-medium"
            >
              Создать первую форму
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
