import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AttachmentDescriptor } from '../types/api';
import { artifactsService } from '../services/artifacts';
import { useVoiceRecorder } from './useVoiceRecorder';
import { useToast } from './useToast';
import { toastMessageForMicrophoneStartFailure } from '../utils/microphoneErrors';
import { logger } from '../utils/logger';

export type ChatVoiceState = 'idle' | 'recording' | 'preview';

interface UseChatVoiceCaptureOptions {
  resetKey: string;
  companyId: number | undefined;
  noteMode: boolean;
  isUploading: boolean;
  setIsUploading: Dispatch<SetStateAction<boolean>>;
  onSendMessage: (text: string, isNote: boolean, attachments?: AttachmentDescriptor[]) => void;
}

export function useChatVoiceCapture({
  resetKey,
  companyId,
  noteMode,
  isUploading,
  setIsUploading,
  onSendMessage,
}: UseChatVoiceCaptureOptions) {
  const toast = useToast();
  const { start: startVoice, stop: stopVoice, cancel: cancelVoice, elapsed } = useVoiceRecorder();

  const [voiceState, setVoiceState_] = useState<ChatVoiceState>('idle');
  const voiceStateRef = useRef<ChatVoiceState>('idle');
  const voiceSendingRef = useRef(false);
  const recordingBarRef = useRef<HTMLDivElement>(null);
  const voicePreviewFileRef = useRef<File | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);

  const setVoiceStateSync = useCallback((s: ChatVoiceState) => {
    voiceStateRef.current = s;
    setVoiceState_(s);
  }, []);

  useEffect(() => {
    cancelVoice();
    setVoiceStateSync('idle');
    setVoicePreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    voicePreviewFileRef.current = null;
  }, [resetKey, cancelVoice, setVoiceStateSync]);

  const cleanupPreview = useCallback(() => {
    setVoicePreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    voicePreviewFileRef.current = null;
  }, []);

  const finishRecording = useCallback(async () => {
    if (voiceSendingRef.current) return;
    voiceSendingRef.current = true;
    const file = await stopVoice();
    voiceSendingRef.current = false;
    if (!file) {
      setVoiceStateSync('idle');
      return;
    }
    voicePreviewFileRef.current = file;
    setVoicePreviewUrl(URL.createObjectURL(file));
    setVoiceStateSync('preview');
  }, [stopVoice, setVoiceStateSync]);

  const confirmSendVoice = useCallback(async () => {
    const file = voicePreviewFileRef.current;
    if (!file || !companyId) return;
    setIsUploading(true);
    try {
      const { artifact_id } = await artifactsService.uploadVoice(companyId, file);
      onSendMessage('', false, [{ artifact_id, type: 'voice', mime_type: 'audio/mpeg' }]);
    } catch {
      toast.error('Не удалось загрузить голосовое');
    } finally {
      setIsUploading(false);
    }
    cleanupPreview();
    setVoiceStateSync('idle');
  }, [companyId, onSendMessage, toast, cleanupPreview, setVoiceStateSync, setIsUploading]);

  const discardVoice = useCallback(() => {
    cleanupPreview();
    setVoiceStateSync('idle');
  }, [cleanupPreview, setVoiceStateSync]);

  const cancelRecording = useCallback(() => {
    cancelVoice();
    cleanupPreview();
    setVoiceStateSync('idle');
  }, [cancelVoice, cleanupPreview, setVoiceStateSync]);

  const toggleVoiceRecording = useCallback(async () => {
    if (!companyId || noteMode || isUploading || voiceSendingRef.current) return;

    if (voiceStateRef.current === 'recording') {
      await finishRecording();
      return;
    }

    if (voiceStateRef.current !== 'idle') return;

    try {
      await startVoice();
      setVoiceStateSync('recording');
    } catch (err) {
      logger.error('Voice recording start failed', err instanceof Error ? err : undefined);
      toast.error(toastMessageForMicrophoneStartFailure(err));
    }
  }, [companyId, noteMode, isUploading, finishRecording, startVoice, setVoiceStateSync, toast]);

  const isVoiceActive = voiceState !== 'idle';

  return {
    voiceState,
    voicePreviewUrl,
    recordingBarRef,
    elapsed,
    isVoiceActive,
    finishRecording,
    confirmSendVoice,
    discardVoice,
    cancelRecording,
    toggleVoiceRecording,
  };
}
