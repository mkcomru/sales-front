import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '../utils/logger';

export function useVoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('navigator.mediaDevices.getUserMedia is not available. Use HTTPS or localhost.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, [clearTimer]);

  const stop = useCallback((): Promise<File | null> => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    clearTimer();
    setElapsed(0);

    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null);

    return new Promise((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const ext = recorder.mimeType.includes('webm') ? 'webm'
          : recorder.mimeType.includes('mp4') ? 'm4a'
          : 'audio';
        resolve(new File([blob], `voice-${Date.now()}.${ext}`, { type: recorder.mimeType }));
      };
      recorder.stop();
    });
  }, [clearTimer]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    clearTimer();
    setElapsed(0);
    if (!recorder || recorder.state === 'inactive') return;
    try {
      recorder.stop();
    } catch (error: unknown) {
      logger.warn('Voice recorder cancel: stop() failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    recorder.stream.getTracks().forEach((t) => t.stop());
    chunksRef.current = [];
  }, [clearTimer]);

  return { start, stop, cancel, isRecording, elapsed };
}
