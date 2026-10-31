import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  XCircle,
  Save,
} from 'lucide-react';
import { promptAddonsService } from '../services';
import type { PromptAddon, CreatePromptAddonRequest } from '../types/api';
import { useToast } from '../hooks/useToast';
import { useAsync } from '../hooks/useAsync';
import { logger } from '../utils/logger';

interface PromptAddonsSettingsProps {
  companyId: number;
}

export const PromptAddonsSettings: React.FC<PromptAddonsSettingsProps> = ({ companyId }) => {
  const { data: addons = [], isLoading: loading, refetch: fetchAddons } = useAsync(
    () => promptAddonsService.list(companyId),
    [companyId],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreatePromptAddonRequest | null>(null);
  const toast = useToast();

  const handleCreate = () => {
    setEditingId(null);
    setForm({ name: '', qualification_workflow: '', qualification_examples: '' });
  };

  const handleEdit = (addon: PromptAddon) => {
    setEditingId(addon.id);
    setForm({
      name: addon.name,
      qualification_workflow: addon.qualification_workflow,
      qualification_examples: addon.qualification_examples,
    });
  };

  const handleSave = async () => {
    if (!form?.name.trim()) return;
    try {
      if (editingId) {
        await promptAddonsService.update(companyId, editingId, form);
      } else {
        await promptAddonsService.create(companyId, form);
      }
      setForm(null);
      setEditingId(null);
      fetchAddons();
      toast.success(editingId ? 'Addon обновлён' : 'Addon создан');
    } catch (error) {
      logger.error('Failed to save addon', error);
      toast.error('Ошибка при сохранении');
    }
  };

  const handleDelete = async (addonId: number) => {
    if (!confirm('Удалить этот Prompt Addon?')) return;
    try {
      await promptAddonsService.delete(companyId, addonId);
      fetchAddons();
      toast.success('Addon удалён');
    } catch (error) {
      logger.error('Failed to delete addon', error);
      toast.error('Ошибка при удалении');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900">Дополнения к промпту</h3>
          <p className="text-[12px] text-gray-500">Дополнительные инструкции для квалификации по коннекторам</p>
        </div>
        {!form && (
          <button
            onClick={handleCreate}
            className="btn-accent btn-sm"
          >
            <Plus size={14} /> Добавить
          </button>
        )}
      </div>

      {form && (
        <div className="p-4 border-2 border-indigo-200 rounded-xl bg-indigo-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-indigo-900">
              {editingId ? 'Редактировать Addon' : 'Новый Addon'}
            </h4>
            <button onClick={() => { setForm(null); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
              <XCircle size={16} />
            </button>
          </div>

          <input
            placeholder="Название"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="form-input"
          />
          <div>
            <label className="form-label block mb-1">Workflow</label>
            <textarea
              value={form.qualification_workflow}
              onChange={e => setForm({ ...form, qualification_workflow: e.target.value })}
              className="form-textarea-mono min-h-[120px]"
              placeholder="Инструкции для квалификации..."
            />
          </div>
          <div>
            <label className="form-label block mb-1">Примеры</label>
            <textarea
              value={form.qualification_examples}
              onChange={e => setForm({ ...form, qualification_examples: e.target.value })}
              className="form-textarea-mono min-h-[100px]"
              placeholder="Few-shot примеры..."
            />
          </div>

          <button
            onClick={handleSave}
            className="btn-accent w-full font-bold"
          >
            <Save size={14} /> Сохранить
          </button>
        </div>
      )}

      <div className="space-y-2">
        {addons.map(addon => (
          <div key={addon.id} className="p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="font-bold text-[13.5px] text-gray-900">{addon.name}</span>
                {addon.qualification_workflow && (
                  <div className="text-[11px] text-gray-400 mt-1 truncate max-w-[300px]">
                    {addon.qualification_workflow.slice(0, 100)}...
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(addon)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(addon.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {addons.length === 0 && !form && (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
            Пока нет дополнений
          </div>
        )}
      </div>
    </div>
  );
};
