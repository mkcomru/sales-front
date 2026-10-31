// Re-export shared types from the canonical source (types/api.ts)
import type { KnowledgeTopic } from './types/api';

export type {
  CompanyField,
  CompanyMember,
  ProductBackend,
  ProductRequest,
  CategoryBackend,
  User,
  UserCompanyInfo,
  ApiMessage,
  KnowledgeTopic,
} from './types/api';

// Alias for backward compatibility — SelectCompany/SelectCompanyPage use this name
export type { UserCompanyInfo as UserCompanyRelation } from './types/api';

// --- Frontend display types (not in API responses) ---

export enum MessageType {
  CLIENT = 'CLIENT',
  AI = 'AI',
  MANAGER = 'MANAGER',
  NOTE = 'NOTE',
  SYSTEM = 'SYSTEM',
}

export interface Message {
  id: string;
  clientId?: string;
  type: MessageType;
  content: string;
  transcription?: string | null;
  createdAt?: string;
  timestamp: string;
  read: boolean;
  senderName?: string;
  senderAvatar?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    error?: string;
    description?: string;
    [key: string]: unknown;
  };
  artifact_ids?: string[];
}

export interface CustomerDetails {
  email: string;
  phone: string;
  location: string;
  username?: string;
  goal?: string;
  problem?: string;
  availability?: string;
  customer_fields: Record<string, string | number | boolean | null>;
  [key: string]: unknown;
}

export interface Stage {
  id: string;
  name: string;
  description?: string;
}

export interface ChatSession {
  id: string;
  customerId?: string;
  customerName: string;
  avatarUrl: string;
  status: 'online' | 'offline' | 'away';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  assistantMode: import('./types/api').AssistantMode;
  isAiManaged: boolean;
  assignee?: Manager | null;
  intentLevel: string;
  dealStage: string;
  orderId?: number;
  orderStage?: import('./types/api').StageInfo | null;
  order?: import('./types/api').OrderSummary | null;
  messages: Message[];
  details: CustomerDetails;
  channel_type?: string;
  connector_transport_type?: string | null;
  conversation_id?: string;
  metadata?: Record<string, unknown>;
  historySynced?: boolean;
}

export interface ProductAttribute {
  id: string;
  key: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  attributes: ProductAttribute[];
  imageUrl?: string;
}

export interface ChatMessageCreateRequest {
  role: 'manager';
  content: string;
  is_note: boolean;
  pause_assistant: boolean;
}

export interface Company {
  id: number;
  name: string;
  assistant_name: string;
  description: string;
  tone_of_voice: string;
  rules: string;
  qualification_workflow?: string;
  qualification_examples?: string;
  knowledge_index?: KnowledgeTopic[];
  knowledge_chunks?: Record<string, string>;
  enabled_tools?: string[];
  active_capabilities?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CrmField {
  id: number;
  company_id: number;
  name: string;
  question: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  order_index?: number;
}

export interface Manager {
  id: string;
  user_id?: number | string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface ApiDialog {
  id: string;
  customer_id?: string;
  updated_at?: string;
  assignee?: Manager;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  messages?: import('./types/api').ApiMessage[];
}
