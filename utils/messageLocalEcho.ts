import { Message, MessageType } from '../types';

const OPTIMISTIC_ID_PREFIX = 'temp-';

function normalizeMessageBody(content: string): string {
  return content.trim();
}

function normalizeArtifacts(artifactIds?: string[]): string {
  if (!artifactIds || artifactIds.length === 0) return '';
  return [...artifactIds].sort().join('|');
}

export function isOptimisticLocalEcho(message: Message): boolean {
  return message.id.startsWith(OPTIMISTIC_ID_PREFIX) || Boolean(message.clientId);
}

export function matchesLocalEcho(candidate: Message, incoming: Message): boolean {
  if (!isOptimisticLocalEcho(candidate)) return false;
  if (candidate.status === 'failed') return false;
  if (candidate.type !== incoming.type) return false;
  if (candidate.type !== MessageType.MANAGER && candidate.type !== MessageType.NOTE) return false;

  return (
    normalizeMessageBody(candidate.content) === normalizeMessageBody(incoming.content) &&
    normalizeArtifacts(candidate.artifact_ids) === normalizeArtifacts(incoming.artifact_ids)
  );
}

export function hydrateLocalEcho(serverMessage: Message, localMessage: Message): Message {
  return {
    ...serverMessage,
    clientId: localMessage.clientId ?? localMessage.id,
    senderName: localMessage.senderName || serverMessage.senderName,
    read: localMessage.read || serverMessage.read,
  };
}
