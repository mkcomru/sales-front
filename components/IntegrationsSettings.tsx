import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertTriangle,
  Plus,
  X,
  Trash2,
  CheckCircle,
  Power,
  PowerOff,
  Puzzle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { integrationsService } from '../services';
import type {
  IntegrationResponse,
  ProviderCatalogEntry,
  CredentialFieldSchema,
  ConfigFieldSchema,
} from '../types/api';
import { isAxiosError } from 'axios';
import { useToast } from '../hooks/useToast';
import { extractApiErrorMessage } from '../utils/errors';

interface IntegrationsSettingsProps {
  companyId: number;
}

const CAPABILITY_LABELS: Record<string, string> = {
  products: 'Товары',
  scheduling: 'Онлайн-запись',
  staff: 'Сотрудники',
  customer_data: 'Данные клиентов',
  orders: 'Заказы',
};

function capabilityLabel(cap: string): string {
  return CAPABILITY_LABELS[cap] ?? cap;
}

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({ companyId }) => {
  const toast = useToast();
  const [integrations, setIntegrations] = useState<IntegrationResponse[]>([]);
  const [catalog, setCatalog] = useState<ProviderCatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderCatalogEntry | null>(null);
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setAccessError(null);
    try {
      setIsLoading(true);
      const [integrationsList, catalogList] = await Promise.all([
        integrationsService.list(companyId),
        integrationsService.catalog(companyId),
      ]);
      setIntegrations(integrationsList);
      setCatalog(catalogList);
    } catch (e: unknown) {
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

  const connectedProviderTypes = new Set(integrations.map((i) => i.provider_type));
  const availableProviders = catalog.filter((p) => !connectedProviderTypes.has(p.provider_type));

  const handleSelectProvider = (provider: ProviderCatalogEntry) => {
    setSelectedProvider(provider);
    setCredentialValues({});
    setConfigValues(
      Object.fromEntries(
        provider.config_fields
          .filter((f) => f.default != null)
          .map((f) => [f.key, String(f.default)]),
      ),
    );
    setSelectedCapabilities([...provider.supported_capabilities]);
    setVisiblePasswords(new Set());
  };

  const resetForm = () => {
    setSelectedProvider(null);
    setCredentialValues({});
    setConfigValues({});
    setSelectedCapabilities([]);
    setIsAdding(false);
    setVisiblePasswords(new Set());
  };

  const handleCreate = async () => {
    if (!selectedProvider) return;

    const missingCreds = selectedProvider.credential_fields
      .filter((f) => f.required && !credentialValues[f.key]?.trim())
      .map((f) => f.label);

    const missingConfig = selectedProvider.config_fields
      .filter((f) => f.required && !configValues[f.key]?.trim())
      .map((f) => f.label);

    const missing = [...missingCreds, ...missingConfig];
    if (missing.length > 0) {
      alert(`Заполните обязательные поля: ${missing.join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await integrationsService.create(companyId, {
        provider_type: selectedProvider.provider_type,
        credentials: credentialValues,
        config: configValues,
        enabled_capabilities: selectedCapabilities,
        enabled: true,
      });
      await fetchData();
      resetForm();
    } catch (e: unknown) {
      toast.error(`Ошибка: ${extractApiErrorMessage(e)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (integration: IntegrationResponse) => {
    const provider = catalog.find((p) => p.provider_type === integration.provider_type);
    const name = provider?.display_name ?? integration.provider_type;
    if (!confirm(`Удалить интеграцию "${name}"?`)) return;
    try {
      await integrationsService.delete(companyId, integration.id);
      setIntegrations((prev) => prev.filter((i) => i.id !== integration.id));
    } catch (e) {
      toast.error(`Не удалось удалить интеграцию: ${extractApiErrorMessage(e)}`);
    }
  };

  const handleToggleEnabled = async (integration: IntegrationResponse) => {
    try {
      const updated = await integrationsService.update(companyId, integration.id, {
        enabled: !integration.enabled,
      });
      setIntegrations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      toast.error(`Не удалось обновить интеграцию: ${extractApiErrorMessage(e)}`);
    }
  };

  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
          <h3 className="text-[14px] font-bold text-gray-900">
            Интеграции ({integrations.length})
          </h3>
          <p className="text-[12px] text-gray-500">
            Подключайте внешние сервисы для расширения возможностей агента
          </p>
        </div>
        {!isAdding && availableProviders.length > 0 && (
          <button
            onClick={() => setIsAdding(true)}
            className="btn-primary"
          >
            <Plus size={14} /> Подключить
          </button>
        )}
      </div>

      {/* --- Add Integration Flow --- */}
      {isAdding && (
        <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-[14px] font-bold text-gray-900">
              {selectedProvider ? `Подключение: ${selectedProvider.display_name}` : 'Выберите сервис'}
            </h4>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {!selectedProvider ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableProviders.map((provider) => (
                <button
                  key={provider.provider_type}
                  onClick={() => handleSelectProvider(provider)}
                  className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    {provider.logo_url ? (
                      <img
                        src={provider.logo_url}
                        alt={provider.display_name}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <Puzzle size={20} className="text-indigo-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-gray-900">
                      {provider.display_name}
                    </div>
                    {provider.description && (
                      <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                        {provider.description}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {provider.supported_capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase"
                        >
                          {capabilityLabel(cap)}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
              {availableProviders.length === 0 && (
                <div className="col-span-2 text-center py-6 text-gray-400 text-[13px]">
                  Все доступные сервисы уже подключены
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Credential Fields */}
              {selectedProvider.credential_fields.length > 0 && (
                <div className="space-y-3">
                  <label className="form-label">
                    Авторизация
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProvider.credential_fields.map((field) => (
                      <FieldInput
                        key={field.key}
                        field={field}
                        value={credentialValues[field.key] ?? ''}
                        onChange={(v) =>
                          setCredentialValues((prev) => ({ ...prev, [field.key]: v }))
                        }
                        isPasswordVisible={visiblePasswords.has(field.key)}
                        onTogglePassword={() => togglePasswordVisibility(field.key)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Config Fields */}
              {selectedProvider.config_fields.length > 0 && (
                <div className="space-y-3">
                  <label className="form-label">
                    Настройки
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProvider.config_fields.map((field) => (
                      <ConfigInput
                        key={field.key}
                        field={field}
                        value={configValues[field.key] ?? ''}
                        onChange={(v) =>
                          setConfigValues((prev) => ({ ...prev, [field.key]: v }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities Selection */}
              <div className="space-y-3">
                <label className="form-label">
                  Возможности
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedProvider.supported_capabilities.map((cap) => (
                    <label
                      key={cap}
                      className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCapabilities.includes(cap)}
                        onChange={() => {
                          setSelectedCapabilities((prev) =>
                            prev.includes(cap)
                              ? prev.filter((c) => c !== cap)
                              : [...prev, cap],
                          );
                        }}
                        className="form-checkbox"
                      />
                      <span className="text-[13px] text-gray-700">{capabilityLabel(cap)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={resetForm}
                  className="btn-ghost"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="btn-accent"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  Подключить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Integrations List --- */}
      <div className="grid grid-cols-1 gap-3">
        {integrations.map((integration) => {
          const provider = catalog.find(
            (p) => p.provider_type === integration.provider_type,
          );
          return (
            <div
              key={integration.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  {provider?.logo_url ? (
                    <img
                      src={provider.logo_url}
                      alt={provider.display_name}
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <Puzzle size={20} className="text-indigo-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[14px] font-bold text-gray-900">
                      {provider?.display_name ?? integration.provider_type}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        integration.enabled
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {integration.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {integration.enabled_capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase"
                      >
                        {capabilityLabel(cap)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleEnabled(integration)}
                  className={`p-2 rounded-lg transition-colors ${
                    integration.enabled
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={integration.enabled ? 'Отключить' : 'Включить'}
                >
                  {integration.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(integration)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {integrations.length === 0 && !isAdding && (
          <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <Puzzle size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-[13px]">Нет подключённых интеграций</p>
            {availableProviders.length > 0 && (
              <button
                onClick={() => setIsAdding(true)}
                className="text-indigo-600 hover:underline text-[13px] mt-1 font-medium"
              >
                Подключить первую интеграцию
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface FieldInputProps {
  field: CredentialFieldSchema;
  value: string;
  onChange: (value: string) => void;
  isPasswordVisible: boolean;
  onTogglePassword: () => void;
}

const FieldInput: React.FC<FieldInputProps> = ({
  field,
  value,
  onChange,
  isPasswordVisible,
  onTogglePassword,
}) => {
  const isPassword = field.field_type === 'password';
  return (
    <div className="space-y-1">
      <label className="form-label">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword && !isPasswordVisible ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="form-input-mono pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {isPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
};

interface ConfigInputProps {
  field: ConfigFieldSchema;
  value: string;
  onChange: (value: string) => void;
}

const ConfigInput: React.FC<ConfigInputProps> = ({ field, value, onChange }) => (
  <div className="space-y-1">
    <label className="form-label">
      {field.label}
      {field.required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <input
      type={field.field_type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="form-input"
    />
  </div>
);

