import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AttachmentDescriptor } from '../types/api';
import { artifactsService } from '../services/artifacts';
import { detectAttachmentType } from '../components/chat/attachmentTypes';
import { useToast } from './useToast';

export interface ChatPendingAttachment {
  file: File;
  previewUrl?: string;
  descriptor: AttachmentDescriptor;
}

interface UsePendingAttachmentUploadsOptions {
  companyId: number | undefined;
  resetKey: string;
  setIsUploading: Dispatch<SetStateAction<boolean>>;
}

export function usePendingAttachmentUploads({
  companyId,
  resetKey,
  setIsUploading,
}: UsePendingAttachmentUploadsOptions) {
  const toast = useToast();
  const [pendingAttachments, setPendingAttachments] = useState<ChatPendingAttachment[]>([]);

  useEffect(() => {
    setPendingAttachments((prev) => {
      prev.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      return [];
    });
  }, [resetKey]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files: File[] = e.target.files ? Array.from(e.target.files) : [];
      if (!files.length || !companyId) return;
      e.target.value = '';
      setIsUploading(true);
      try {
        const uploaded = await Promise.all(
          files.map(async (file) => {
            const type = detectAttachmentType(file);
            const { artifact_id } = await artifactsService.upload(companyId, file, type);
            const previewUrl = type === 'image' ? URL.createObjectURL(file) : undefined;
            return {
              file,
              previewUrl,
              descriptor: {
                artifact_id,
                type,
                mime_type: file.type || 'application/octet-stream',
              },
            } satisfies ChatPendingAttachment;
          }),
        );
        setPendingAttachments((p) => [...p, ...uploaded]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить файл';
        toast.error(errorMessage);
      } finally {
        setIsUploading(false);
      }
    },
    [companyId, toast, setIsUploading],
  );

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((prev) => {
      prev.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      return [];
    });
  }, []);

  return { pendingAttachments, setPendingAttachments, handleFileChange, clearPendingAttachments };
}
