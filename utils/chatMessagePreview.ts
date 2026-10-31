import type { ChatSession, Message } from '../types';
import { messageBodyText } from './messageBodyText';
import { isDocumentArtifactId, isImageArtifactId, isVoiceArtifactId } from './artifactKinds';

const IMAGE_PLACEHOLDER_RE = /^(\[?(фото|изображение|image|photo|picture)\]?|🖼|📷)$/i;

function readDurationSeconds(metadata: Record<string, unknown> | undefined): number | null {
  if (!metadata) return null;
  const candidates = [
    metadata.duration_seconds,
    metadata.durationSeconds,
    metadata.audio_duration_seconds,
    metadata.audioDurationSeconds,
    metadata.duration,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0) {
      return candidate;
    }
    if (typeof candidate === 'string') {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return null;
}

function formatAudioDuration(seconds: number | null): string {
  if (seconds == null) return '';
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function readArtifactIds(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) return [];
  const candidates = [
    metadata.artifact_ids,
    metadata.last_message_artifact_ids,
    metadata.attachments,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.flatMap((value) => {
        if (typeof value === 'string') return [value];
        if (
          value &&
          typeof value === 'object' &&
          'artifact_id' in value &&
          typeof value.artifact_id === 'string'
        ) {
          return [value.artifact_id];
        }
        return [];
      });
    }
  }

  return [];
}

function readExplicitMessageKind(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const candidates = [
    metadata.message_type,
    metadata.last_message_type,
    metadata.attachment_type,
    metadata.last_attachment_type,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

function isAudioKind(kind: string | null): boolean {
  return kind === 'voice' || kind === 'audio' || kind === 'voice_message' || kind === 'audio_message';
}

function isImageKind(kind: string | null): boolean {
  return (
    kind === 'image' ||
    kind === 'photo' ||
    kind === 'picture' ||
    kind === 'inbound_image' ||
    kind === 'image_message'
  );
}

export function getMessagePreview(message: Pick<Message, 'content' | 'transcription' | 'artifact_ids' | 'metadata'>): string {
  const body = messageBodyText(message).trim();
  const artifacts = message.artifact_ids?.length ? message.artifact_ids : readArtifactIds(message.metadata);
  const voiceArtifacts = artifacts.filter(isVoiceArtifactId);
  const imageArtifacts = artifacts.filter(isImageArtifactId);
  const documentArtifacts = artifacts.filter(isDocumentArtifactId);
  const explicitKind = readExplicitMessageKind(message.metadata);

  if (voiceArtifacts.length > 0 || isAudioKind(explicitKind)) {
    const duration = formatAudioDuration(readDurationSeconds(message.metadata));
    return duration ? `Аудиосообщение (${duration})` : 'Аудиосообщение';
  }

  if (!body && (imageArtifacts.length > 0 || isImageKind(explicitKind))) {
    return imageArtifacts.length > 1 ? `Фотографии (${imageArtifacts.length})` : 'Фото';
  }

  if (IMAGE_PLACEHOLDER_RE.test(body)) {
    return 'Фото';
  }

  if (!body && documentArtifacts.length > 0) {
    return documentArtifacts.length > 1 ? `Документы (${documentArtifacts.length})` : 'Документ';
  }

  return body;
}

export function getThreadPreview(chat: Pick<ChatSession, 'lastMessage' | 'messages' | 'metadata'>): string {
  const lastCachedMessage = chat.messages[chat.messages.length - 1];
  if (lastCachedMessage) {
    const preview = getMessagePreview(lastCachedMessage).trim();
    if (preview) return preview;
  }

  const fallbackPreview = getMessagePreview({
    content: chat.lastMessage,
    transcription: undefined,
    artifact_ids: undefined,
    metadata: chat.metadata,
  }).trim();

  return fallbackPreview;
}
