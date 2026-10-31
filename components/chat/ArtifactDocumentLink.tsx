import React, { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { artifactsService } from '../../services/artifacts';

export const ArtifactDocumentLink = React.memo<{
  companyId: number;
  artifactId: string;
}>(({ companyId, artifactId }) => {
  const fileName = artifactId.split('/').pop() ?? 'Документ';
  const [busy, setBusy] = useState(false);

  const onOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { url } = await artifactsService.getPresignedDownloadUrl(companyId, artifactId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={busy}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 max-w-[240px] disabled:opacity-60"
    >
      {busy ? (
        <Loader2 size={16} className="flex-shrink-0 text-gray-500 animate-spin" />
      ) : (
        <FileText size={16} className="flex-shrink-0 text-gray-500" />
      )}
      <span className="text-[12px] font-medium truncate flex-1 text-left">{fileName}</span>
      <Download size={13} className="flex-shrink-0 text-gray-400" />
    </button>
  );
});
ArtifactDocumentLink.displayName = 'ArtifactDocumentLink';
