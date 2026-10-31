import React, { useState } from 'react';
import { Copy, CheckCircle, ExternalLink, Code2 } from 'lucide-react';
import type { FormTemplate, CompanyField } from '../../types/api';
import { API_BASE_URL } from '../../config/env';

interface CodeSnippetProps {
  form: FormTemplate;
  fields: CompanyField[];
  companyId: number;
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({ form, fields }) => {
  const [copied, setCopied] = useState(false);

  const getFieldName = (fieldId: number): string => {
    const field = fields.find(f => f.id === fieldId);
    return field?.name || `field_${fieldId}`;
  };

  const getFieldDisplayName = (fieldId: number): string => {
    const field = fields.find(f => f.id === fieldId);
    return field?.display_name || field?.name || `field_${fieldId}`;
  };

  const apiBase = API_BASE_URL || window.location.origin;
  const apiEndpoint = `${apiBase}/api/v1/forms/key/capture`;
  const contactFieldName = getFieldName(form.contact_field_id);

  const code = `// API endpoint for external integrations
// Requires X-Form-Key header with your API key

fetch('${apiEndpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Form-Key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    fields: {
      // ${getFieldDisplayName(form.contact_field_id)} (contact, required)
      "${contactFieldName}": "client@example.com"${
        form.template_fields.length > 0
          ? `,
${form.template_fields
  .map(tf => {
    const name = getFieldName(tf.field_id);
    const displayName = getFieldDisplayName(tf.field_id);
    return `      // ${displayName}
      "${name}": "value"`;
  })
  .join(',\n')}`
          : ''
      }
    },
    utm: {
      source: "website",
      medium: "form",
      campaign: "landing"
    }
  })
})`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-gray-400" />
          <label className="text-[11px] font-bold text-gray-400 uppercase">
            Пример кода (для разработчиков)
          </label>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[11px] transition-colors"
        >
          {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>

      <div className="p-3 bg-gray-900 rounded-lg overflow-x-auto">
        <pre className="text-[11px] text-gray-300 font-mono whitespace-pre">{code}</pre>
      </div>

      <p className="text-[10px] text-gray-400 mt-2">
        Поля передаются по имени (name), не по ID. API ключ получите выше.
      </p>
    </div>
  );
};
