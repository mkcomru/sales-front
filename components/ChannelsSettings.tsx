import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  MessageCircle,
  Globe,
  Trash2,
  Loader2,
  AlertTriangle,
  Plus,
  X,
  Smartphone,
  CheckCircle,
  Clock,
  Edit2,
  ChevronDown,
  ChevronRight,
  Inbox,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { connectorsService, promptAddonsService } from '../services';
import type { Connector, ConnectorCapability, ConnectorConfig, ConnectorTypeCatalogEntry, PromptAddon } from '../types/api';
import { isAxiosError } from 'axios';
import { useToast } from '../hooks/useToast';
import { extractApiErrorMessage } from '../utils/errors';
import { logger } from '../utils/logger';
import telegramImg from '../assets/connectors/telegram.png';
import wappiWhatsappImg from '../assets/connectors/wappi-whatsapp.png';
import wappiTelegramImg from '../assets/connectors/wappi-telegram.png';
import wappiVkImg from '../assets/connectors/wappi-vk.png';

/** Neutral well so transparent connector PNGs read clearly on the card surface. */
const CONNECTOR_ICON_WELL_CLASS = 'bg-neutral-50 ring-1 ring-black/[0.06]';

type SyncProgressFields = {
  more_chats_scan_offset?: number;
  more_chats_exhausted?: boolean;
  processed_chats?: number;
  total_chats?: number;
  processed_messages?: number;
  total_messages?: number;
  cursor?: string;
  last_heartbeat_at?: string;
  error?: string;
};

const SYNC_STATUS_META: Record<
  string,
  { label: string; badge: string; hint: string }
> = {
  idle: {
    label: 'Синхронизация не идёт',
    badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70',
    hint: 'Канал готов к работе',
  },
  initial: {
    label: 'Первичная загрузка',
    badge: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80',
    hint: 'Загружаем первые диалоги из мессенджера',
  },
  backfill: {
    label: 'Догрузка истории',
    badge: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/80',
    hint: 'Подтягиваем более старые сообщения',
  },
  catchup: {
    label: 'Догоняем пропуски',
    badge: 'bg-violet-50 text-violet-900 ring-1 ring-violet-200/80',
    hint: 'Сверяемся с мессенджером после паузы',
  },
  completed: {
    label: 'Завершено',
    badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70',
    hint: 'Цикл синхронизации успешно закончился',
  },
  failed: {
    label: 'Ошибка синхронизации',
    badge: 'bg-red-50 text-red-800 ring-1 ring-red-200/80',
    hint: 'Проверьте токен Wappi и доступность API',
  },
};

function parseSyncProgress(raw: Connector['sync_progress']): SyncProgressFields {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const num = (k: string): number | undefined => {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    return undefined;
  };
  const str = (k: string): string | undefined => {
    const v = o[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
    return undefined;
  };
  return {
    more_chats_scan_offset: num('more_chats_scan_offset'),
    more_chats_exhausted: typeof o.more_chats_exhausted === 'boolean' ? o.more_chats_exhausted : undefined,
    processed_chats: num('processed_chats'),
    total_chats: num('total_chats'),
    processed_messages: num('processed_messages'),
    total_messages: num('total_messages'),
    cursor: str('cursor'),
    last_heartbeat_at: str('last_heartbeat_at'),
    error: str('error') ?? str('last_error'),
  };
}

function formatRelativeRu(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  const diffSec = Math.round((t - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });
  const a = Math.abs(diffSec);
  if (a < 45) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 48) return rtf.format(diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 14) return rtf.format(diffDay, 'day');
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface ChannelsSettingsProps {
  companyId: number;
}

type ConnectorTypeOption = 'telegram-bot' | 'wappi-whatsapp' | 'wappi-telegram' | 'wappi-vk';

const CAPABILITY_META: Record<ConnectorCapability, { label: string; color: string }> = {
  inbound_text:     { label: 'Текст ↓',  color: 'bg-gray-100 text-gray-600' },
  inbound_voice:    { label: 'Голос ↓',  color: 'bg-blue-50 text-blue-600' },
  inbound_audio:    { label: 'Аудио ↓',  color: 'bg-blue-50 text-blue-600' },
  inbound_image:    { label: 'Фото ↓',   color: 'bg-indigo-50 text-indigo-600' },
  inbound_video:    { label: 'Видео ↓',  color: 'bg-indigo-50 text-indigo-600' },
  inbound_document: { label: 'Файлы ↓',  color: 'bg-indigo-50 text-indigo-600' },
  outbound_text:    { label: 'Текст ↑',  color: 'bg-emerald-50 text-emerald-600' },
  outbound_media:   { label: 'Медиа ↑',  color: 'bg-emerald-50 text-emerald-600' },
  history_sync:     { label: 'История',  color: 'bg-amber-50 text-amber-600' },
};

const CONNECTOR_TYPE_OPTIONS: {
  type: ConnectorTypeOption;
  catalogType: string;
  label: string;
  description: string;
  image: string;
}[] = [
  {
    type: 'telegram-bot',
    catalogType: 'telegram',
    label: 'Telegram Bot',
    description: 'Официальный Bot API',
    image: telegramImg,
  },
  {
    type: 'wappi-whatsapp',
    catalogType: 'wappi-whatsapp',
    label: 'WhatsApp',
    description: 'Через Wappi',
    image: wappiWhatsappImg,
  },
  {
    type: 'wappi-telegram',
    catalogType: 'wappi-telegram',
    label: 'Telegram Personal',
    description: 'Через Wappi',
    image: wappiTelegramImg,
  },
  {
    type: 'wappi-vk',
    catalogType: 'wappi-vk',
    label: 'VK',
    description: 'Через Wappi',
    image: wappiVkImg,
  },
];

export const ChannelsSettings: React.FC<ChannelsSettingsProps> = ({ companyId }) => {
  const toast = useToast();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [catalog, setCatalog] = useState<ConnectorTypeCatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [syncSectionOpenId, setSyncSectionOpenId] = useState<number | null>(null);

  // Connection Form State
  const [isAdding, setIsAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<ConnectorTypeOption>('telegram-bot');

  // Form Fields
  const [formToken, setFormToken] = useState('');
  const [formInstanceId, setFormInstanceId] = useState(''); // For Wappi
  const [formName, setFormName] = useState(''); // User defined name
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addons, setAddons] = useState<PromptAddon[]>([]);
  const [editingConnectorId, setEditingConnectorId] = useState<number | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDebounce, setEditDebounce] = useState('');
  const [editPromptAddonId, setEditPromptAddonId] = useState<number | null>(null);
  const [isSavingConnector, setIsSavingConnector] = useState(false);

  const fetchAddons = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await promptAddonsService.list(companyId);
      setAddons(data);
    } catch {
      // Addons might not be available
    }
  }, [companyId]);

  const fetchConnectors = useCallback(async () => {
    if (!companyId) return;
    setAccessError(null);
    try {
      setIsLoading(true);
      const list = await connectorsService.list(companyId);
      setConnectors(list);
    } catch (e: any) {
      logger.error('Failed to fetch connectors', e);
      if (isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        setAccessError(`Ошибка доступа (${e.response.status}).`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchConnectors();
    fetchAddons();
    connectorsService.getCatalog().then(setCatalog);
  }, [fetchConnectors, fetchAddons]);

  const openConnectorEdit = (connector: Connector) => {
    setEditingConnectorId(connector.id);
    setEditDisplayName(connector.display_name);
    setEditDebounce(
      connector.debounce_window_seconds !== undefined
        ? String(connector.debounce_window_seconds)
        : ''
    );
    setEditPromptAddonId(connector.prompt_addon_id ?? null);
  };

  const closeConnectorEdit = useCallback(() => {
    setEditingConnectorId(null);
    setEditDisplayName('');
    setEditDebounce('');
    setEditPromptAddonId(null);
  }, []);

  useEffect(() => {
    if (editingConnectorId === null) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        closeConnectorEdit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingConnectorId, closeConnectorEdit]);

  const handleDisconnect = async (connector: Connector) => {
    if (!confirm(`Вы уверены, что хотите удалить канал "${connector.display_name}"?`)) return;
    try {
      await connectorsService.delete(connector.id);
      setConnectors(prev => prev.filter(c => c.id !== connector.id));
      if (editingConnectorId === connector.id) {
        closeConnectorEdit();
      }
    } catch (e: any) {
      logger.error('Disconnect failed', e);
      toast.error(`Не удалось отключить канал: ${extractApiErrorMessage(e)}`);
    }
  };

  const handleSaveConnectorEdit = async (connector: Connector) => {
    const nameNext = editDisplayName.trim();
    if (!nameNext) {
      toast.warning('Введите название');
      return;
    }
    if (!editDebounce.trim()) {
      toast.warning('Введите значение debounce');
      return;
    }
    const debounceNum = parseInt(editDebounce, 10);
    if (isNaN(debounceNum) || debounceNum < 1 || debounceNum > 300) {
      toast.warning('Debounce: от 1 до 300 секунд');
      return;
    }

    const payload: Record<string, unknown> = {};
    if (nameNext !== connector.display_name) {
      payload.display_name = nameNext;
    }
    if (debounceNum !== connector.debounce_window_seconds) {
      payload.debounce_window_seconds = debounceNum;
    }
    const addonNext = editPromptAddonId;
    if (addonNext !== connector.prompt_addon_id) {
      payload.prompt_addon_id = addonNext;
    }
    if (Object.keys(payload).length === 0) {
      closeConnectorEdit();
      return;
    }

    try {
      setIsSavingConnector(true);
      const updated = await connectorsService.update(connector.id, payload as Partial<Connector>);
      setConnectors(prev =>
        prev.map(conn => (conn.id === connector.id ? { ...conn, ...updated } : conn))
      );
      closeConnectorEdit();
    } catch (err: unknown) {
      toast.error(`Ошибка: ${extractApiErrorMessage(err)}`);
    } finally {
      setIsSavingConnector(false);
    }
  };

  const handleAddConnector = async () => {
    if (!selectedType) return;

    // Validation
    if (selectedType === 'telegram-bot' && !formToken) {
      toast.warning('Введите токен бота');
      return;
    }
    if ((selectedType.startsWith('wappi')) && (!formToken || !formInstanceId)) {
      toast.warning('Введите API Key и Profile ID');
      return;
    }

    try {
      setIsSubmitting(true);

      let type: 'telegram' | 'wappi' | 'custom' = 'telegram';
      let config: ConnectorConfig = {} as ConnectorConfig;
      let name = formName;
      let metadata: Record<string, string> = {};

      if (selectedType === 'telegram-bot') {
        type = 'telegram';
        name = name || 'Telegram Bot';
        config = { bot_token: formToken };
      } else if (selectedType === 'wappi-whatsapp') {
        type = 'wappi';
        name = name || `WhatsApp (${formInstanceId})`;
        config = { wappi_token: formToken, wappi_profile_id: formInstanceId };
        metadata = { platform: 'whatsapp' };
      } else if (selectedType === 'wappi-telegram') {
        type = 'wappi';
        name = name || `Telegram User (${formInstanceId})`;
        config = { wappi_token: formToken, wappi_profile_id: formInstanceId };
        metadata = { platform: 'telegram' };
      } else if (selectedType === 'wappi-vk') {
        type = 'wappi';
        name = name || `VK (${formInstanceId})`;
        config = { wappi_token: formToken, wappi_profile_id: formInstanceId };
        metadata = { platform: 'vk' };
      }

      const channel_type =
        selectedType === 'wappi-whatsapp'
          ? 'whatsapp'
          : selectedType === 'wappi-vk'
            ? 'vk'
            : 'telegram';

      const connector_id = `${type}_${Date.now()}`;

      await connectorsService.create(companyId, {
        company_id: companyId,
        connector_id,
        type,
        channel_type,
        display_name: name,
        config,
        enabled: true,
      });

      await fetchConnectors();
      setIsAdding(false);
      resetForm();

    } catch (e: unknown) {
      logger.error('Create failed', e);
      toast.error(`Ошибка: ${extractApiErrorMessage(e)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormToken('');
    setFormInstanceId('');
    setFormName('');
  };

  const getConnectorCapabilities = (connector: Connector): ConnectorCapability[] => {
    const compound = `${connector.type}-${connector.channel_type}`;
    const entry = catalog.find(e => e.connector_type === compound)
      ?? catalog.find(e => e.connector_type === connector.type);
    return entry?.supported_capabilities ?? [];
  };

  const getConnectorPreviewImage = (c: Connector): string | null => {
    if (c.type === 'telegram') return telegramImg;
    if (c.type === 'wappi') {
      if (c.channel_type === 'whatsapp') return wappiWhatsappImg;
      if (c.channel_type === 'telegram') return wappiTelegramImg;
      if (c.channel_type === 'vk') return wappiVkImg;
    }
    return null;
  };

  const getConnectorPreviewFallback = (c: Connector) => {
    if (c.type === 'telegram') return <Send size={20} className="text-sky-500" />;
    if (c.type === 'wappi') {
      if (c.channel_type === 'telegram') return <Send size={20} className="text-sky-500" />;
      if (c.channel_type === 'vk') return <MessageCircle size={20} className="text-blue-500" />;
      return <MessageCircle size={20} className="text-green-500" />;
    }
    return <Globe size={20} className="text-gray-400" />;
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

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

      {/* --- Header & Add Button --- */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-gray-900">Активные каналы ({connectors.length})</h3>
          <p className="text-[12px] text-gray-500">Управляйте подключениями к мессенджерам</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => {
              closeConnectorEdit();
              setIsAdding(true);
              resetForm();
            }}
            className="btn-primary btn-sm"
          >
            <Plus size={14} /> Добавить канал
          </button>
        )}
      </div>

      {/* --- Add Connector Form --- */}
      {isAdding && (
        <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-[14px] font-bold text-gray-900">Новое подключение</h4>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          <div className="space-y-4 mb-4">

            {/* Type Selection — card grid */}
            <div className="space-y-2">
              <label className="form-label">Тип канала</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CONNECTOR_TYPE_OPTIONS.map(opt => {
                  const caps = catalog.find(e => e.connector_type === opt.catalogType)?.supported_capabilities ?? [];
                  const isSelected = selectedType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setSelectedType(opt.type)}
                      className={`flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg ${CONNECTOR_ICON_WELL_CLASS}`}
                        >
                          <img
                            src={opt.image}
                            alt=""
                            className="h-full w-full object-cover object-center"
                            draggable={false}
                          />
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-gray-900 leading-tight">{opt.label}</div>
                          <div className="text-[11px] text-gray-400 leading-tight">{opt.description}</div>
                        </div>
                      </div>
                      {caps.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {caps.map(cap => (
                            <span key={cap} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${CAPABILITY_META[cap].color}`}>
                              {CAPABILITY_META[cap].label}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name input */}
            <div className="space-y-1">
              <label className="form-label">Название (для себя)</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  selectedType === 'telegram-bot'
                    ? 'Мой Бот'
                    : selectedType === 'wappi-vk'
                      ? 'Рабочий VK'
                      : 'Рабочий WhatsApp'
                }
                className="form-input"
              />
            </div>

            {/* Dynamic Fields */}
            {selectedType === 'telegram-bot' ? (
              <div className="col-span-2 space-y-1">
                <label className="form-label">Bot Token</label>
                <input
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                  placeholder="123456:ABC-DEF1234ghIkl-zyx5"
                  className="form-input-mono"
                />
                <p className="text-[11px] text-gray-400">Токен от @BotFather</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="form-label">API Key (Wappi)</label>
                  <input
                    value={formToken}
                    onChange={(e) => setFormToken(e.target.value)}
                    placeholder="API Key"
                    className="form-input-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="form-label">Profile ID</label>
                  <input
                    value={formInstanceId}
                    onChange={(e) => setFormInstanceId(e.target.value)}
                    placeholder="Profile ID / Instance ID"
                    className="form-input-mono"
                  />
                </div>
              </>
            )}
            </div>{/* end inner grid */}
          </div>{/* end space-y-4 */}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="btn-ghost"
            >
              Отмена
            </button>
            <button
              onClick={handleAddConnector}
              disabled={isSubmitting}
              className="btn-accent"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Подключить
            </button>
          </div>
        </div>
      )}

      {/* --- Connectors List --- */}
      <div className="grid grid-cols-1 gap-3">
        {connectors.map(c => {
          const previewSrc = getConnectorPreviewImage(c);
          const isEditing = editingConnectorId === c.id;
          const caps = getConnectorCapabilities(c);
          const addonLabel =
            c.prompt_addon_id != null
              ? addons.find(a => a.id === c.prompt_addon_id)?.name ?? `#${c.prompt_addon_id}`
              : 'Без addon';

          return (
            <div
              key={c.id}
              className={[
                'rounded-2xl transition-all text-left w-full overflow-hidden',
                isEditing
                  ? 'bg-white ring-2 ring-indigo-300 shadow-md'
                  : 'bg-white ring-1 ring-black/[0.06] shadow-sm hover:ring-black/[0.1]',
              ].join(' ')}
            >
            <div
              role={isEditing ? undefined : 'button'}
              tabIndex={isEditing ? undefined : 0}
              onClick={() => {
                if (!isEditing) openConnectorEdit(c);
              }}
              onKeyDown={(e) => {
                if (isEditing) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openConnectorEdit(c);
                }
              }}
              className={[
                'flex cursor-pointer items-center justify-between gap-3 p-4 w-full text-left',
                isEditing ? '' : 'hover:bg-neutral-50/80',
              ].join(' ')}
            >
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg ${CONNECTOR_ICON_WELL_CLASS}`}
                >
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt=""
                      className="h-full w-full object-cover object-center"
                      draggable={false}
                    />
                  ) : (
                    getConnectorPreviewFallback(c)
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {isEditing ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="form-label w-full">
                          Название
                        </label>
                        <input
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isSavingConnector}
                          className="form-input max-w-md font-semibold"
                          autoFocus
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Clock size={14} className="text-gray-400 flex-shrink-0" />
                        <label className="form-label">
                          Debounce (сек)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={editDebounce}
                          onChange={(e) => setEditDebounce(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isSavingConnector}
                          className="form-input w-24"
                        />
                      </div>
                      {addons.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <label className="form-label">
                            Workflow addon
                          </label>
                          <select
                            value={editPromptAddonId ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEditPromptAddonId(v ? parseInt(v, 10) : null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSavingConnector}
                            className="form-select max-w-md"
                          >
                            <option value="">Без addon</option>
                            {addons.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleSaveConnectorEdit(c);
                          }}
                          disabled={isSavingConnector}
                          className="btn-accent btn-sm rounded-xl font-semibold"
                        >
                          {isSavingConnector ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeConnectorEdit();
                          }}
                          disabled={isSavingConnector}
                          className="btn-ghost btn-sm rounded-xl font-semibold"
                        >
                          Отмена
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[14px] font-bold text-neutral-900">{c.display_name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {c.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="text-[12px] text-gray-400 font-mono">
                        ID: {c.connector_id} • Type: {c.channel_type}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <Clock size={12} className="text-gray-400 flex-shrink-0" />
                        <span>
                          Debounce:{' '}
                          {c.debounce_window_seconds !== undefined
                            ? `${c.debounce_window_seconds} сек`
                            : 'не задано'}
                        </span>
                      </div>
                      {addons.length > 0 && (
                        <p className="text-[11px] text-neutral-500">
                          Addon: <span className="font-medium text-neutral-700">{addonLabel}</span>
                        </p>
                      )}
                    </>
                  )}
                  {!isEditing && caps.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {caps.map(cap => {
                        const meta = CAPABILITY_META[cap];
                        return (
                          <span key={cap} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.color}`}>
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => openConnectorEdit(c)}
                    className="p-2 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors"
                    title="Изменить"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDisconnect(c)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

              {!isEditing &&
                caps.includes('history_sync') &&
                c.type === 'wappi' &&
                c.connector_id && (
                  <div
                    className="border-t border-black/[0.06] bg-sidebar px-4 py-3"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 text-left text-[12px] font-semibold text-neutral-700"
                      onClick={() =>
                        setSyncSectionOpenId(syncSectionOpenId === c.id ? null : c.id)
                      }
                    >
                      {syncSectionOpenId === c.id ? (
                        <ChevronDown size={16} className="text-neutral-400" />
                      ) : (
                        <ChevronRight size={16} className="text-neutral-400" />
                      )}
                      Синхронизация
                    </button>
                    {syncSectionOpenId === c.id && (() => {
                      const sp = parseSyncProgress(c.sync_progress);
                      const statusKey = (c.sync_status ?? '').toLowerCase();
                      const statusMeta = SYNC_STATUS_META[statusKey] ?? {
                        label: c.sync_status ?? '—',
                        badge: 'bg-neutral-100 text-neutral-800 ring-1 ring-black/[0.08]',
                        hint: '',
                      };
                      const pct =
                        sp.total_chats != null &&
                        sp.total_chats > 0 &&
                        sp.processed_chats != null
                          ? Math.min(100, Math.round((sp.processed_chats / sp.total_chats) * 100))
                          : null;
                      const hasProgressStats =
                        sp.processed_chats != null ||
                        sp.processed_messages != null ||
                        sp.cursor != null ||
                        sp.last_heartbeat_at != null ||
                        sp.more_chats_scan_offset != null;

                      return (
                        <div className="mt-3 space-y-3 pl-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${statusMeta.badge}`}
                              title={statusMeta.hint || undefined}
                            >
                              {statusMeta.label}
                            </span>
                            {c.sync_started_at != null && c.sync_started_at !== '' && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-secondary">
                                <RefreshCw size={12} className="opacity-60" />
                                Старт {formatRelativeRu(c.sync_started_at) ?? c.sync_started_at}
                              </span>
                            )}
                            {c.sync_completed_at != null && c.sync_completed_at !== '' && (
                              <span className="text-[11px] text-secondary">
                                Готово {formatRelativeRu(c.sync_completed_at) ?? c.sync_completed_at}
                              </span>
                            )}
                          </div>

                          {hasProgressStats && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {sp.processed_chats != null && (
                                <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2">
                                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
                                    <Inbox size={12} />
                                    Чаты
                                  </div>
                                  <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-primary">
                                    {sp.processed_chats}
                                    {sp.total_chats != null ? ` / ${sp.total_chats}` : ''}
                                  </div>
                                </div>
                              )}
                              {sp.processed_messages != null && (
                                <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2">
                                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
                                    <MessageSquare size={12} />
                                    Сообщения
                                  </div>
                                  <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-primary">
                                    {sp.processed_messages}
                                    {sp.total_messages != null ? ` / ${sp.total_messages}` : ''}
                                  </div>
                                </div>
                              )}
                              {sp.cursor != null && (
                                <div className="col-span-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 sm:col-span-1">
                                  <div className="text-[10px] font-medium uppercase tracking-wide text-secondary">
                                    Курсор
                                  </div>
                                  <div
                                    className="mt-0.5 truncate font-mono text-[11px] text-neutral-700"
                                    title={sp.cursor}
                                  >
                                    {sp.cursor}
                                  </div>
                                </div>
                              )}
                              {sp.last_heartbeat_at != null && (
                                <div className="col-span-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 sm:col-span-3">
                                  <div className="text-[10px] font-medium uppercase tracking-wide text-secondary">
                                    Последний пульс
                                  </div>
                                  <div className="mt-0.5 text-[12px] font-medium text-primary">
                                    {formatRelativeRu(sp.last_heartbeat_at) ?? sp.last_heartbeat_at}
                                  </div>
                                </div>
                              )}
                              {sp.more_chats_scan_offset != null && (
                                <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2">
                                  <div className="text-[10px] font-medium uppercase tracking-wide text-secondary">
                                    Смещение списка
                                  </div>
                                  <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-primary">
                                    {sp.more_chats_scan_offset}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {pct != null && (
                            <div>
                              <div className="mb-1 flex justify-between text-[10px] text-secondary">
                                <span>Прогресс чатов</span>
                                <span className="tabular-nums">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                                <div
                                  className="h-full rounded-full bg-indigo-500 transition-[width] duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {sp.error != null && sp.error !== '' && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-900">
                              {sp.error}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
            </div>
          );
        })}

        {connectors.length === 0 && !isAdding && (
          <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <Smartphone size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-[13px]">Нет активных каналов</p>
            <button onClick={() => setIsAdding(true)} className="text-indigo-600 hover:underline text-[13px] mt-1 font-medium">
              Добавить первый канал
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
