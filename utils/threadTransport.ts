import type { ChatSession } from '../types';

/** True when backend could not resolve a Connector row (deleted / not configured). */
export function isThreadTransportUnavailable(
  chat: Pick<ChatSession, 'connector_transport_type'> | null | undefined,
): boolean {
  if (!chat) return true;
  return chat.connector_transport_type == null;
}
