import React, { useState, useCallback } from 'react';
import { Key, Eye, EyeOff, Copy, CheckCircle, RefreshCw, ClipboardList, Loader2, ExternalLink, Link2 } from 'lucide-react';

interface ApiKeyDisplayProps {
  publicId: string;
  apiKey: string | null;
  hasApiKey: boolean;
  isRegenerating: boolean;
  isLoadingSubmissions: boolean;
  onRegenerate: () => void;
  onLoadSubmissions: () => void;
}

export const ApiKeyDisplay: React.FC<ApiKeyDisplayProps> = ({
  publicId,
  apiKey,
  hasApiKey,
  isRegenerating,
  isLoadingSubmissions,
  onRegenerate,
  onLoadSubmissions,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const publicFormUrl = `${window.location.origin}/f/${publicId}`;

  const handleCopyKey = useCallback(async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }, [apiKey]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(publicFormUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [publicFormUrl]);

  return (
    <div className="border-t border-gray-100 pt-4 space-y-4">
      {/* Public Link - always visible */}
      <div>
        <label className="text-[11px] font-bold text-gray-400 uppercase mb-2 block">
          Публичная ссылка
        </label>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={14} className="text-blue-600" />
            <span className="text-[12px] font-bold text-blue-700">Ссылка для клиентов</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-white border border-blue-200 rounded text-[12px] font-mono overflow-hidden text-blue-800">
              {publicFormUrl}
            </code>
            <a
              href={publicFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded transition-colors"
              title="Открыть форму"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={handleCopyLink}
              className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded transition-colors"
              title="Копировать ссылку"
            >
              {copiedLink ? <CheckCircle size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-blue-600 mt-2">
            Отправьте эту ссылку клиентам — они смогут заполнить форму без авторизации.
          </p>
        </div>
      </div>

      {/* API Key section - for developers */}
      <div>
        <label className="text-[11px] font-bold text-gray-400 uppercase mb-2 block">
          API для разработчиков
        </label>

        {apiKey && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-emerald-600" />
                <span className="text-[12px] font-bold text-emerald-700">API ключ</span>
              </div>
              <button onClick={() => setShowKey(!showKey)} className="text-emerald-600 hover:text-emerald-700">
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 p-2 bg-white border border-emerald-200 rounded text-[11px] font-mono overflow-hidden">
                {showKey ? apiKey : '•'.repeat(40)}
              </code>
              <button
                onClick={handleCopyKey}
                className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded transition-colors"
                title="Копировать ключ"
              >
                {copiedKey ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-emerald-600 mt-2">
              Сохраните ключ! Он показывается только один раз.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
          >
            {isRegenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {hasApiKey ? 'Перегенерировать ключ' : 'Создать API ключ'}
          </button>
          <button
            onClick={onLoadSubmissions}
            disabled={isLoadingSubmissions}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
          >
            {isLoadingSubmissions ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
            Заявки
          </button>
        </div>

        {!apiKey && (
          <p className="text-[10px] text-gray-400 mt-2">
            API ключ нужен только для интеграции через код (внешние сайты, скрипты).
          </p>
        )}
      </div>
    </div>
  );
};
