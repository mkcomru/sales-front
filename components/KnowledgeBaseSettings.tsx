import React, { useCallback } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

export interface KnowledgeTopicEntry {
  topic_id: string;
  title: string;
  description: string;
  content: string;
}

interface KnowledgeBaseSettingsProps {
  topics: KnowledgeTopicEntry[];
  onChange: (topics: KnowledgeTopicEntry[]) => void;
  onSave: () => void | Promise<void>;
  isSaving: boolean;
}

export const KnowledgeBaseSettings: React.FC<KnowledgeBaseSettingsProps> = ({
  topics,
  onChange,
  onSave,
  isSaving,
}) => {
  const handleAdd = useCallback(() => {
    const id = `topic_${Date.now()}`;
    onChange([...topics, { topic_id: id, title: '', description: '', content: '' }]);
  }, [topics, onChange]);

  const handleDelete = useCallback(
    (index: number) => {
      onChange(topics.filter((_, i) => i !== index));
    },
    [topics, onChange],
  );

  const handleUpdate = useCallback(
    (index: number, field: keyof KnowledgeTopicEntry, value: string) => {
      onChange(
        topics.map((t, i) => {
          if (i !== index) return t;
          if (field === 'topic_id') {
            return { ...t, topic_id: value.replace(/[^a-z0-9_]/g, '') };
          }
          return { ...t, [field]: value };
        }),
      );
    },
    [topics, onChange],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[12px] text-secondary">
          В промпт попадает только оглавление тем. Полный текст агент запрашивает через get_knowledge(topic_id).
        </p>
        <button type="button" onClick={handleAdd} className="btn-primary btn-sm mt-3 inline-flex items-center gap-1.5">
          <Plus size={14} />
          Добавить тему
        </button>
      </div>

      {topics.length === 0 ? (
        <p className="text-[13px] text-secondary">Пока нет тем.</p>
      ) : null}

      {topics.map((topic, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-secondary">Тема {index + 1}</span>
            <button
              type="button"
              onClick={() => handleDelete(index)}
              className="btn-ghost btn-sm inline-flex items-center gap-1 text-red-600"
            >
              <Trash2 size={14} />
              Удалить
            </button>
          </div>
          <div>
            <label className="form-label">ID темы</label>
            <input
              type="text"
              className="form-input-mono"
              value={topic.topic_id}
              onChange={(e) => handleUpdate(index, 'topic_id', e.target.value)}
              placeholder="ai_scope_boundaries"
            />
          </div>
          <div>
            <label className="form-label">Название</label>
            <input
              type="text"
              className="form-input"
              value={topic.title}
              onChange={(e) => handleUpdate(index, 'title', e.target.value)}
              placeholder="Кратко для оглавления"
            />
          </div>
          <div>
            <label className="form-label">Описание в оглавлении</label>
            <input
              type="text"
              className="form-input"
              value={topic.description}
              onChange={(e) => handleUpdate(index, 'description', e.target.value)}
              placeholder="Одна строка, что внутри темы"
            />
          </div>
          <div>
            <label className="form-label">Содержание</label>
            <textarea
              className="form-textarea-mono min-h-[160px]"
              value={topic.content}
              onChange={(e) => handleUpdate(index, 'content', e.target.value)}
              placeholder="Текст, который вернёт get_knowledge"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => void onSave()}
        disabled={isSaving}
        className="btn-primary self-start inline-flex items-center gap-2"
      >
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Сохранить базу знаний
      </button>
    </div>
  );
};
