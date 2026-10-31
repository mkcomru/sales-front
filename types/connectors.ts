// Connector types for transport integrations (New API)

export type ConnectorType = 'telegram' | 'wappi' | 'custom';

export interface Connector {
  id: number; // connector_db_id in API
  connector_id: string;
  company_id: number;
  type: ConnectorType;
  channel_type: string;
  display_name: string;
  managed: boolean;
  config: Record<string, any>;
  enabled: boolean;
  debounce_window_seconds?: number;
  debounce_storage_key_template?: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectorCreateRequest {
  connector_id: string;
  company_id: number;
  type: ConnectorType;
  channel_type: string;
  display_name: string;
  managed?: boolean;
  config: Record<string, any>;
  enabled?: boolean;
  debounce_window_seconds?: number;
  debounce_storage_key_template?: string;
}

export interface ConnectorUpdateRequest {
  connector_id?: string | null;
  company_id?: number | null;
  type?: ConnectorType | null;
  channel_type?: string | null;
  display_name?: string | null;
  managed?: boolean | null;
  config?: Record<string, any> | null;
  enabled?: boolean | null;
  debounce_window_seconds?: number | null;
  debounce_storage_key_template?: string | null;
}

export interface ConnectorListResponse {
  items: Connector[];
  total: number;
}

export interface ConnectorApiKeyResponse {
  id: number;
  connector_db_id: number;
  key: string; // Only shown once on creation
  key_prefix: string;
  created_at: string;
}

export interface ConnectorApiKeyListItem {
  id: number;
  connector_db_id: number;
  key_prefix: string;
  created_at: string;
  last_used_at?: string | null;
}

// Legacy types for backward compatibility (deprecated)
export interface TelegramBot {
  id?: number;
  bot_id?: number;
  connector_id?: string;
  company_id: number;
  bot_token?: string;
  channel_type?: string;
  mode?: string;
  enabled?: boolean;
}

export interface WappiConnector {
  id?: number;
  connector_id?: string;
  company_id: number;
  api_key?: string;
  profile_id?: string;
  channel_type?: string;
  enabled?: boolean;
}

export interface BotsResponse {
  bots: TelegramBot[];
}

export interface ConnectorsResponse {
  connectors: WappiConnector[];
}
