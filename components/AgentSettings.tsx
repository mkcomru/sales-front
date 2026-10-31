import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  SendHorizontal,
  Sparkles,
  CheckCircle,
  X,
  XCircle,
  AlertTriangle,
  Type,
  Hash,
  List,
  Save,
  Loader2,
  Plus,
  Trash2,
  CheckSquare,
  Edit2,
  ChevronDown,
} from 'lucide-react';
import { apiClient, toolsService } from '../services';
import type { AgentReadinessItem, AgentReadinessResponse, ToolGroupResponse } from '../types/api';
import { Company } from '../types';
import { CompanyField } from '../types/api';
import { companiesService } from '../services';
import { useStages } from '../hooks/useStages';
import { useToast } from '../hooks/useToast';
import { useIdentityContext } from '../contexts/IdentityContext';
import { extractApiErrorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import { ChannelsSettings } from './ChannelsSettings';
import { FormsSettings } from './FormsSettings';
import { TeamSchedule } from './TeamSchedule';
import { PromptAddonsSettings } from './PromptAddonsSettings';
import { IntegrationsSettings } from './IntegrationsSettings';
import { FormCheckbox } from './FormCheckbox';
import { KnowledgeBaseSettings } from './KnowledgeBaseSettings';

type SettingsTab =
  | 'general'
  | 'personality'
  | 'logic'
  | 'fields'
  | 'tools'
  | 'knowledge'
  | 'channels'
  | 'forms'
  | 'team'
  | 'addons'
  | 'integrations';

interface AgentSettingsProps {
  companyId: number;
}

const VALID_TABS = new Set<SettingsTab>([
  'general',
  'personality',
  'logic',
  'fields',
  'tools',
  'knowledge',
  'channels',
  'forms',
  'team',
  'addons',
  'integrations',
]);

const READINESS_ITEM_CUSTOM_UI = new Set<AgentReadinessItem['type']>(['target_stage']);

const READINESS_COPY: Record<
  AgentReadinessItem['type'],
  { ok: string; fail: string }
> = {
  company_name: {
    ok: 'Название компании задано',
    fail: 'Укажите название компании',
  },
  company_description: {
    ok: 'Описание бизнеса заполнено',
    fail: 'Заполните описание бизнеса',
  },
  assistant_name: {
    ok: 'Имя ассистента задано',
    fail: 'Укажите имя ассистента',
  },
  transport_connector: {
    ok: 'Есть активный канал связи',
    fail: 'Подключите и включите хотя бы один канал',
  },
  target_stage: {
    ok: 'Целевая стадия для метрик выбрана',
    fail: 'Выберите целевую стадию воронки для метрик',
  },
};

export const AgentSettings: React.FC<AgentSettingsProps> = ({ companyId }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const activeTab: SettingsTab = tabParam && VALID_TABS.has(tabParam) ? tabParam : 'general';

  const setActiveTab = useCallback((tab: SettingsTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const toast = useToast();

  const [companyData, setCompanyData] = useState<Company>({
    id: companyId,
    name: '',
    assistant_name: '',
    description: '',
    tone_of_voice: '',
    rules: '',
    qualification_workflow: '',
    qualification_examples: '',
    knowledge_index: [],
    knowledge_chunks: {},
    enabled_tools: [],
    active_capabilities: [],
  });
  const [availableTools, setAvailableTools] = useState<ToolGroupResponse[]>([]);
  const [readiness, setReadiness] = useState<AgentReadinessResponse | null>(null);
  const [targetStageId, setTargetStageId] = useState<number | null>(null);

  const fetchCompanyData = useCallback(async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setReadiness(null);
      const data = await companiesService.getConfig(companyId);
      if (!data) {
        logger.warn("Config returned no data");
        return;
      }

      setCompanyData(prev => ({
        ...prev,
        ...data,
        rules: data.rules ?? prev.rules,
        tone_of_voice: data.tone_of_voice ?? prev.tone_of_voice,
        assistant_name: data.assistant_name ?? prev.assistant_name,
        qualification_workflow: data.qualification_workflow ?? prev.qualification_workflow,
        qualification_examples: data.qualification_examples ?? prev.qualification_examples,
        knowledge_index: (data.knowledge_index as Company['knowledge_index']) ?? prev.knowledge_index ?? [],
        knowledge_chunks: (data.knowledge_chunks as Company['knowledge_chunks']) ?? prev.knowledge_chunks ?? {},
        enabled_tools: data.enabled_tools ?? prev.enabled_tools ?? [],
        active_capabilities: (data.active_capabilities as string[]) ?? prev.active_capabilities ?? [],
      }));

      try {
        const detail = await companiesService.getById(companyId);
        setTargetStageId(detail.target_stage_id ?? null);
      } catch (detailErr) {
        logger.warn('Company detail load failure (target stage)', detailErr);
        setTargetStageId(null);
      }

      try {
        setReadiness(await companiesService.getAgentReadiness(companyId));
      } catch (readinessErr) {
        logger.error('Agent readiness load failure', readinessErr);
        setReadiness(null);
      }
    } catch (error) {
      logger.error("Settings load failure", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const handleTargetStageChange = useCallback(
    async (stageId: number) => {
      try {
        await companiesService.patch(companyId, { target_stage_id: stageId });
        setTargetStageId(stageId);
        toast.success('Целевая стадия для метрик обновлена');
        setReadiness(await companiesService.getAgentReadiness(companyId));
      } catch (error) {
        logger.error('target_stage_id patch failed', error);
        toast.error(extractApiErrorMessage(error));
      }
    },
    [companyId, toast],
  );

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  useEffect(() => {
    toolsService.getAvailableTools(companyId).then(setAvailableTools).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'tools') {
      void fetchCompanyData();
    }
  }, [activeTab, fetchCompanyData]);

  const handleChange = (field: keyof Company, value: string | string[]) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  };

  const persistCompany = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');

      const payload = {
        name: companyData.name,
        assistant_name: companyData.assistant_name,
        description: companyData.description,
        tone_of_voice: companyData.tone_of_voice,
        rules: companyData.rules,
        qualification_workflow: companyData.qualification_workflow,
        qualification_examples: companyData.qualification_examples,
        knowledge_index: companyData.knowledge_index,
        knowledge_chunks: companyData.knowledge_chunks,
      };

      await apiClient.patch(`/api/v1/companies/${companyId}`, payload);
      setSaveStatus('success');
      await fetchCompanyData();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      logger.error("Save failed", error);
      setSaveStatus('error');
      const msg = extractApiErrorMessage(error);
      toast.error(`Ошибка сохранения: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }, [companyData, companyId, fetchCompanyData, toast]);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    void persistCompany();
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white">
      <div className="w-[60%] border-r border-gray-200 flex flex-col h-full bg-white">
        <div className="h-[64px] px-8 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <h2 className="text-[15px] font-bold text-gray-900">Настройки Агента</h2>
          <div className="flex items-center gap-3">
            {saveStatus === 'success' && <span className="text-[12px] text-emerald-600"><CheckCircle size={14} className="inline mr-1" /> Сохранено</span>}
            <button onClick={handleSave} disabled={isSaving} className="btn-primary">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Сохранить
            </button>
          </div>
        </div>

        <div className="px-8 pt-6 pb-2 overflow-x-auto">
          <div className="inline-flex gap-1 bg-gray-100/80 p-1 rounded-lg">
            <SegmentedTab label="Общие" active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
            <SegmentedTab label="Характер" active={activeTab === 'personality'} onClick={() => setActiveTab('personality')} />
            <SegmentedTab label="Логика" active={activeTab === 'logic'} onClick={() => setActiveTab('logic')} />
            <SegmentedTab label="Поля" active={activeTab === 'fields'} onClick={() => setActiveTab('fields')} />
            <SegmentedTab label="Каналы" active={activeTab === 'channels'} onClick={() => setActiveTab('channels')} />
            <SegmentedTab label="Команда" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
            <SegmentedTab label="Интеграции" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
            <SegmentedTab label="Дополнения" active={activeTab === 'addons'} onClick={() => setActiveTab('addons')} />
            <SegmentedTab label="Формы" active={activeTab === 'forms'} onClick={() => setActiveTab('forms')} />
            <SegmentedTab label="Инструменты" active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />
            <SegmentedTab label="База знаний" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl flex flex-col gap-8">
            {activeTab === 'general' && (
              <>
                <InputGroup label="Название компании">
                  <input type="text" value={companyData.name} onChange={(e) => handleChange('name', e.target.value)} className="form-input" />
                </InputGroup>
                <InputGroup label="Имя ассистента">
                  <input type="text" value={companyData.assistant_name} onChange={(e) => handleChange('assistant_name', e.target.value)} className="form-input" />
                </InputGroup>
                <InputGroup label="Описание бизнеса">
                  <textarea value={companyData.description} onChange={(e) => handleChange('description', e.target.value)} className="form-textarea min-h-[140px]" />
                </InputGroup>
              </>
            )}
            {activeTab === 'personality' && (
              <>
                <InputGroup label="Tone of Voice">
                  <textarea value={companyData.tone_of_voice} onChange={(e) => handleChange('tone_of_voice', e.target.value)} className="form-textarea min-h-[140px]" />
                </InputGroup>
                <InputGroup label="Правила">
                  <textarea value={companyData.rules} onChange={(e) => handleChange('rules', e.target.value)} className="form-textarea-mono min-h-[240px]" />
                </InputGroup>
              </>
            )}
            {activeTab === 'logic' && (
              <>
                <InputGroup label="Квалификация">
                  <textarea value={companyData.qualification_workflow} onChange={(e) => handleChange('qualification_workflow', e.target.value)} className="form-textarea-mono min-h-[200px]" />
                </InputGroup>
                <InputGroup label="Примеры">
                  <textarea value={companyData.qualification_examples} onChange={(e) => handleChange('qualification_examples', e.target.value)} className="form-textarea-mono min-h-[200px]" />
                </InputGroup>
              </>
            )}
            {activeTab === 'fields' && <FieldsEditor companyId={companyId} />}
            {activeTab === 'tools' && (
              <ToolsEditor
                availableTools={availableTools}
                enabledTools={companyData.enabled_tools ?? []}
                activeCapabilities={companyData.active_capabilities ?? []}
              />
            )}
            {activeTab === 'knowledge' && (
              <KnowledgeBaseSettings
                topics={(() => {
                  const index = companyData.knowledge_index ?? [];
                  const chunks = companyData.knowledge_chunks ?? {};
                  return index.map((item) => ({
                    topic_id: item.topic_id,
                    title: item.title ?? '',
                    description: item.description ?? '',
                    content: chunks[item.topic_id] ?? '',
                  }));
                })()}
                onChange={(topics) => {
                  const newIndex = topics.map(({ topic_id, title, description }) => ({ topic_id, title, description }));
                  const newChunks: Record<string, string> = {};
                  for (const t of topics) {
                    if (t.content) newChunks[t.topic_id] = t.content;
                  }
                  setCompanyData((prev) => ({
                    ...prev,
                    knowledge_index: newIndex,
                    knowledge_chunks: newChunks,
                  }));
                  setSaveStatus('idle');
                }}
                onSave={persistCompany}
                isSaving={isSaving}
              />
            )}
            {activeTab === 'channels' && <ChannelsSettings companyId={companyId} />}
            {activeTab === 'team' && <TeamSchedule companyId={companyId} />}
            {activeTab === 'addons' && <PromptAddonsSettings companyId={companyId} />}
            {activeTab === 'forms' && <FormsSettings companyId={companyId} />}
            {activeTab === 'integrations' && <IntegrationsSettings companyId={companyId} />}
          </div>
        </div>
      </div>

      <div className="w-[40%] flex flex-col h-full bg-white border-l border-gray-100 p-6 overflow-y-auto">
        <h3 className="text-[15px] font-bold mb-2">Здоровье Агента</h3>
        {readiness && (
          <p
            className={`text-[12px] font-medium mb-4 ${
              readiness.is_ready_to_deploy ? 'text-emerald-700' : 'text-amber-800'
            }`}
          >
            {readiness.is_ready_to_deploy
              ? 'Все обязательные пункты выполнены'
              : 'Есть блокирующие пункты — агент может работать неполно'}
          </p>
        )}
        <div className="space-y-3">
          {readiness?.items.map((item) => {
            const copy = READINESS_COPY[item.type];
            const text = item.ok ? copy.ok : copy.fail;
            const status: HealthRowStatus = item.ok
              ? 'success'
              : item.severity === 'advisory'
                ? 'warning'
                : 'error';
            if (READINESS_ITEM_CUSTOM_UI.has(item.type)) {
              if (item.type === 'target_stage') {
                return (
                  <ReadinessTargetStageAccordion
                    key={item.type}
                    companyId={companyId}
                    status={status}
                    summaryText={text}
                    itemOk={item.ok}
                    targetStageId={targetStageId}
                    onChangeTargetStage={handleTargetStageChange}
                    onOpenFunnel={() => navigate(`/${companyId}/funnel`)}
                  />
                );
              }
            }
            const settingsTab = readinessItemSettingsTab(item);
            return (
              <HealthRow
                key={item.type}
                status={status}
                text={text}
                settingsTab={settingsTab ?? undefined}
                onRowClick={settingsTab ? () => setActiveTab(settingsTab) : undefined}
              />
            );
          })}
          {!readiness && (
            <div className="flex items-center gap-2 text-[12px] text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              Проверка настроек…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ToolsEditorProps {
  availableTools: ToolGroupResponse[];
  enabledTools: string[];
  activeCapabilities: string[];
}

const ToolsEditor: React.FC<ToolsEditorProps> = ({ availableTools, enabledTools, activeCapabilities }) => (
  <div className="space-y-6">
    <p className="text-[12px] text-gray-500">
      Список вычисляется из каталога инструментов и активных интеграций. Изменить набор можно через вкладку
      «Интеграции».
    </p>
    {activeCapabilities.length > 0 && (
      <div className="space-y-2">
        <h4 className="form-label">Активные возможности</h4>
        <div className="flex flex-wrap gap-2">
          {activeCapabilities.map((c) => (
            <span
              key={c}
              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[12px] font-medium text-gray-800"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    )}
    {availableTools.length === 0 ? (
      <div className="text-center py-8 text-gray-400 text-sm">Загрузка...</div>
    ) : (
      <div className="space-y-8">
        {availableTools.map((grp) => (
          <div key={grp.group} className="space-y-3">
            <h4 className="form-label">{grp.group}</h4>
            <div className="flex flex-col gap-2 max-w-2xl">
              {grp.tools.map((tool) => (
                <React.Fragment key={tool.name}>
                  <FormCheckbox
                    checked={enabledTools.includes(tool.name)}
                    onChange={() => {}}
                    disabled
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 transition-colors w-full items-start"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-gray-900">{tool.name}</span>
                      <span className="text-[12px] font-normal leading-snug text-gray-500">{tool.description}</span>
                    </span>
                  </FormCheckbox>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const FIELD_TYPE_OPTIONS: { type: string; label: string; icon: React.ReactNode }[] = [
  { type: 'string', label: 'Текст', icon: <Type size={18} /> },
  { type: 'number', label: 'Число', icon: <Hash size={18} /> },
  { type: 'enum', label: 'Выбор', icon: <List size={18} /> },
  { type: 'boolean', label: 'Да/Нет', icon: <CheckSquare size={18} /> },
];

const FieldsEditor = ({ companyId }: { companyId: number }) => {
  const toast = useToast();
  const [fields, setFields] = useState<CompanyField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [fieldForm, setFieldForm] = useState<Partial<CompanyField> | null>(null);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [pendingOptions, setPendingOptions] = useState<string[]>([]);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fieldsCacheRef = useRef<{ companyId: number; fields: CompanyField[]; timestamp: number } | null>(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const fetchFields = useCallback(async () => {
    const cached = fieldsCacheRef.current;
    if (cached && cached.companyId === companyId && Date.now() - cached.timestamp < CACHE_TTL) {
      setFields(cached.fields);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const fieldList = await companiesService.getFields(companyId);
      fieldsCacheRef.current = { companyId, fields: fieldList, timestamp: Date.now() };
      setFields(fieldList);
    } catch (error) {
      logger.error('Failed to fetch fields', error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleCreate = (level: 'customer' | 'order' = 'customer') => {
    setEditingFieldId(null);
    setPendingOptions([]);
    setFieldForm({
      name: '',
      display_name: '',
      question: '',
      type: 'string',
      required: false,
      level,
      options: []
    });
  };

  const handleEdit = (field: CompanyField) => {
    setEditingFieldId(field.id);
    setPendingOptions([]);
    setFieldForm({ ...field });
  };

  const handleSave = async () => {
    if (!fieldForm) return;
    if (!fieldForm.name || !fieldForm.display_name || !fieldForm.question) {
      toast.error('Заполните обязательные поля (имя, отображаемое имя, вопрос)');
      return;
    }
    const isEnum = fieldForm?.type === 'enum';
    const optionsToCreate = editingFieldId ? [] : pendingOptions;
    if (isEnum && !editingFieldId && optionsToCreate.length === 0) {
      toast.error('Для поля «Выбор» добавьте хотя бы одну опцию');
      return;
    }

    try {
      setIsSaving(true);
      if (editingFieldId) {
        await companiesService.updateField(companyId, editingFieldId, fieldForm);
        toast.success('Поле обновлено');
      } else {
        const created = await companiesService.createField(companyId, fieldForm);
        for (let i = 0; i < optionsToCreate.length; i++) {
          await companiesService.createFieldOption(companyId, created.id, { value: optionsToCreate[i], order: i });
        }
        toast.success('Поле создано');
      }
      setFieldForm(null);
      setEditingFieldId(null);
      setPendingOptions([]);
      fieldsCacheRef.current = null;
      fetchFields();
    } catch (error) {
      logger.error('Failed to save field', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (fieldId: number) => {
    if (!confirm('Удалить это поле?')) return;
    try {
      await companiesService.deleteField(companyId, fieldId);
      fieldsCacheRef.current = null;
      setFields(prev => prev.filter(f => f.id !== fieldId));
      toast.success('Поле удалено');
    } catch (error) {
      logger.error('Failed to delete field', error);
      toast.error('Ошибка при удалении');
    }
  };

  const handleAddOption = async () => {
    const value = newOptionValue.trim();
    if (!value) return;

    if (!editingFieldId) {
      if (pendingOptions.includes(value)) return;
      setPendingOptions(prev => [...prev, value]);
      setNewOptionValue('');
      return;
    }

    try {
      setIsAddingOption(true);
      const newOption = await companiesService.createFieldOption(companyId, editingFieldId, { value });
      setFieldForm(prev => ({
        ...prev,
        options: [...(prev?.options || []), newOption]
      }));
      setNewOptionValue('');
      setFields(prev => prev.map(f => f.id === editingFieldId ? { ...f, options: [...(f.options || []), newOption] } : f));
    } catch (error) {
      logger.error('Failed to add option', error);
      toast.error('Ошибка при добавлении опции');
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleRemoveOption = async (optionIdOrValue: number | string) => {
    if (!editingFieldId) {
      setPendingOptions(prev => prev.filter(v => v !== optionIdOrValue));
      return;
    }
    if (typeof optionIdOrValue !== 'number') return;
    try {
      await companiesService.deleteFieldOption(companyId, editingFieldId, optionIdOrValue);
      setFieldForm(prev => ({
        ...prev,
        options: prev?.options?.filter(o => o.id !== optionIdOrValue)
      }));
      setFields(prev => prev.map(f => f.id === editingFieldId ? { ...f, options: f.options?.filter(o => o.id !== optionIdOrValue) } : f));
    } catch (error) {
      logger.error('Failed to remove option', error);
      toast.error('Ошибка при удалении опции');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  const enumOptionsList = fieldForm
    ? (editingFieldId ? (fieldForm.options ?? []) : pendingOptions.map(v => ({ id: v, value: v })))
    : [];
  const canAddEnumOption = fieldForm?.type === 'enum';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900">Настраиваемые поля ({fields.length})</h3>
          <p className="text-[12px] text-gray-500">Поля для сбора данных о клиентах и заказах</p>
        </div>
        {!fieldForm && (
          <button
            onClick={() => handleCreate()}
            className="btn-primary btn-sm"
          >
            <Plus size={14} />
            Поле
          </button>
        )}
      </div>

      {fieldForm && (
        <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-[14px] font-bold text-gray-900">
              {editingFieldId ? 'Редактировать поле' : 'Новое поле'}
            </h4>
            <button
              onClick={() => { setFieldForm(null); setEditingFieldId(null); setPendingOptions([]); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <label className="form-label">Уровень поля</label>
              <div className="grid grid-cols-2 gap-3">
                {(['customer', 'order'] as const).map(level => {
                  const isSelected = (fieldForm.level || 'customer') === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFieldForm(prev => prev ? { ...prev, level } : null)}
                      className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className="text-[13px] font-bold text-gray-900">
                        {level === 'customer' ? 'Поле клиента' : 'Поле заказа'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {level === 'customer' ? 'Данные о контакте' : 'Данные о заказе'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="form-label">Тип поля</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FIELD_TYPE_OPTIONS.map(opt => {
                  const isSelected = (fieldForm.type || 'string') === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setFieldForm(prev => prev ? { ...prev, type: opt.type } : null)}
                      className={`flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-indigo-600">
                        {opt.icon}
                        <span className="text-[13px] font-bold text-gray-900">{opt.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label">Системное имя (name)</label>
                <input
                  value={fieldForm.name || ''}
                  onChange={e => setFieldForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="phone, company_name..."
                  disabled={!!editingFieldId}
                  className="form-input disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label">Отображаемое имя</label>
                <input
                  value={fieldForm.display_name || ''}
                  onChange={e => setFieldForm(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                  placeholder="Телефон, Компания..."
                  className="form-input"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label">Вопрос для сбора данных</label>
              <input
                value={fieldForm.question || ''}
                onChange={e => setFieldForm(prev => prev ? { ...prev, question: e.target.value } : null)}
                placeholder="Как к вам обращаться? Какой у вас телефон?"
                className="form-input"
              />
            </div>

            <label className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg text-[13px] cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={fieldForm.required || false}
                onChange={e => setFieldForm(prev => prev ? { ...prev, required: e.target.checked } : null)}
              />
              <span className="font-medium text-gray-900">Обязательное поле</span>
            </label>

            {canAddEnumOption && (
              <div className="space-y-2 pt-2 border-t border-indigo-200/50">
                <label className="form-label">Опции выбора</label>
                <div className="flex flex-wrap gap-2">
                  {enumOptionsList.map(opt => (
                    <div
                      key={editingFieldId ? opt.id : opt.value}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm text-indigo-700 shadow-sm"
                    >
                      <span>{opt.value}</span>
                      <button
                        onClick={() => handleRemoveOption(editingFieldId ? opt.id : opt.value)}
                        className="text-indigo-300 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {enumOptionsList.length === 0 && (
                    <div className="text-[12px] text-indigo-400 italic">Добавьте хотя бы одну опцию</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    placeholder="Новая опция..."
                    value={newOptionValue}
                    onChange={e => setNewOptionValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                    className="form-input flex-1"
                  />
                  <button
                    onClick={handleAddOption}
                    disabled={isAddingOption || !newOptionValue.trim()}
                    className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg text-[13px] font-medium hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAddingOption ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Добавить
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setFieldForm(null); setEditingFieldId(null); setPendingOptions([]); }}
              className="btn-ghost"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-accent"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Customer Fields */}
      <FieldGroup
        title="Поля клиента"
        fields={fields.filter(f => f.level === 'customer')}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Order Fields */}
      <FieldGroup
        title="Поля заказа"
        fields={fields.filter(f => f.level === 'order')}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Fields without level (legacy) */}
      {fields.filter(f => !f.level).length > 0 && (
        <FieldGroup
          title="Прочие поля"
          fields={fields.filter(f => !f.level)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {fields.length === 0 && !fieldForm && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
          Нет активных полей
        </div>
      )}
    </div>
  );
};

interface SegmentedTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const SegmentedTab: React.FC<SegmentedTabProps> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`whitespace-nowrap px-3 py-1.5 text-[13px] rounded-md transition-colors ${
      active
        ? 'bg-white shadow-sm text-gray-900 font-medium'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {label}
  </button>
);

interface InputGroupProps {
  label: string;
  children: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, children }) => (
  <div className="flex flex-col gap-2"><label className="form-label">{label}</label>{children}</div>
);

type HealthRowStatus = 'success' | 'error' | 'warning';

interface HealthRowProps {
  status: HealthRowStatus;
  text: string;
  /** Tab opened by onRowClick; used for aria-label. */
  settingsTab?: SettingsTab;
  /** When set with settingsTab, the whole row opens that settings tab. */
  onRowClick?: () => void;
}

const TAB_LABELS: Record<SettingsTab, string> = {
  general: 'Общие',
  personality: 'Характер',
  logic: 'Логика',
  fields: 'Поля',
  tools: 'Инструменты',
  knowledge: 'База знаний',
  channels: 'Каналы',
  forms: 'Формы',
  team: 'Команда',
  addons: 'Дополнения',
  integrations: 'Интеграции',
};

function readinessItemSettingsTab(item: AgentReadinessItem): SettingsTab | null {
  switch (item.type) {
    case 'company_name':
    case 'company_description':
    case 'assistant_name':
      return 'general';
    case 'transport_connector':
      return 'channels';
    default:
      return null;
  }
}

const HealthRow: React.FC<HealthRowProps> = ({ status, text, settingsTab, onRowClick }) => {
  const icon =
    status === 'success' ? (
      <CheckCircle size={14} className="text-emerald-500 shrink-0" />
    ) : status === 'warning' ? (
      <AlertTriangle size={14} className="text-amber-500 shrink-0" />
    ) : (
      <XCircle size={14} className="text-red-500 shrink-0" />
    );
  const rowInner = (
    <div className="flex items-start gap-2 text-[12px] text-gray-800 leading-snug">
      {icon}
      <span className="flex-1 min-w-0">{text}</span>
    </div>
  );
  const baseClass =
    'rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 flex flex-col gap-1.5';

  if (onRowClick && settingsTab) {
    return (
      <button
        type="button"
        onClick={onRowClick}
        className={`${baseClass} w-full text-left cursor-pointer transition-colors hover:bg-gray-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-1`}
        aria-label={`Открыть раздел «${TAB_LABELS[settingsTab]}»`}
      >
        {rowInner}
      </button>
    );
  }

  return <div className={baseClass}>{rowInner}</div>;
};

interface ReadinessTargetStageAccordionProps {
  companyId: number;
  status: HealthRowStatus;
  summaryText: string;
  itemOk: boolean;
  targetStageId: number | null;
  onChangeTargetStage: (stageId: number) => Promise<void>;
  onOpenFunnel: () => void;
}

const ReadinessTargetStageAccordion: React.FC<ReadinessTargetStageAccordionProps> = ({
  companyId,
  status,
  summaryText,
  itemOk,
  targetStageId,
  onChangeTargetStage,
  onOpenFunnel,
}) => {
  const { identityState } = useIdentityContext();
  const { stages, loading: stagesLoading } = useStages(companyId);
  const [open, setOpen] = useState(!itemOk);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!itemOk) {
      setOpen(true);
    }
  }, [itemOk]);

  const canConfigure = useMemo(() => {
    const u = identityState.currentUser;
    if (!u) return false;
    if (u.is_superuser) return true;
    const r = u.companies.find((c) => c.company_id === companyId);
    return r ? ['admin', 'owner'].includes(r.role) : false;
  }, [identityState.currentUser, companyId]);

  const orderedStages = useMemo(() => {
    const regular = stages.filter((s) => !s.is_final);
    const final = stages.filter((s) => s.is_final);
    return [...regular, ...final];
  }, [stages]);

  const selectedLabel = useMemo(() => {
    if (targetStageId == null) return 'не выбрана — нужно указать стадию';
    const s = stages.find((x) => x.id === targetStageId);
    return s ? s.name : `#${targetStageId}`;
  }, [targetStageId, stages]);

  const icon =
    status === 'success' ? (
      <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
    ) : status === 'warning' ? (
      <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
    ) : (
      <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
    );

  const apply = async (stageId: number) => {
    if (!canConfigure || saving) return;
    setSaving(true);
    try {
      await onChangeTargetStage(stageId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-100/60 transition-colors"
        aria-expanded={open}
      >
        {icon}
        <span className="flex-1 min-w-0">
          <span className="block text-[12px] text-gray-800 leading-snug">{summaryText}</span>
          <span className="block text-[11px] text-gray-500 mt-0.5">Сейчас: {selectedLabel}</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform mt-0.5 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-white px-2 py-2 max-h-[min(240px,40vh)] overflow-y-auto">
          {!canConfigure ? (
            <div className="px-2 py-2 space-y-2">
              <p className="text-[11px] text-gray-600 leading-snug">
                Изменять целевую стадию могут владелец или администратор компании.
              </p>
              <button
                type="button"
                onClick={onOpenFunnel}
                className="text-[11px] font-semibold text-accent hover:underline"
              >
                Открыть воронку
              </button>
            </div>
          ) : stagesLoading ? (
            <div className="flex items-center justify-center py-4 text-gray-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : orderedStages.length === 0 ? (
            <div className="px-2 py-2 space-y-2">
              <p className="text-[11px] text-gray-600 leading-snug">Нет стадий в воронке — добавьте хотя бы одну.</p>
              <button
                type="button"
                onClick={onOpenFunnel}
                className="text-[11px] font-semibold text-accent hover:underline"
              >
                Открыть воронку
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5" role="listbox">
              {orderedStages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={targetStageId === s.id}
                  disabled={saving}
                  onClick={() => void apply(s.id)}
                  className={`w-full text-left rounded-md px-2.5 py-1.5 text-[12px] transition-colors disabled:opacity-50 ${
                    targetStageId === s.id
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface FieldGroupProps {
  title: string;
  fields: CompanyField[];
  onEdit: (field: CompanyField) => void;
  onDelete: (fieldId: number) => void;
}

const FieldGroup: React.FC<FieldGroupProps> = ({ title, fields, onEdit, onDelete }) => {
  if (fields.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-2">{title}</h4>
      {fields.map(field => (
        <div key={field.id} className="p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13.5px] text-gray-900">{field.display_name || field.name}</span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{field.type}</span>
                {field.required && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">обязательно</span>}
                {field.is_system && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">system</span>}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 font-mono">{field.name}</div>
              {field.question && <div className="text-[12px] text-indigo-600 mt-1 italic leading-tight">"{field.question}"</div>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(field)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 size={14} /></button>
              {!field.is_system && (
                <button onClick={() => onDelete(field.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
