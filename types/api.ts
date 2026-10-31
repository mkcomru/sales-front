// API Response Types

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

// Auth API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
}

// --- Shared nested types ---

export interface StageInfo {
  id: number;
  name: string;
  color: string | null;
  position: number;
}

export interface AssigneeInfo {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  role: string;
}

export interface CustomerInfo {
  id: number;
  user_id: string;
  name: string | null;
}

export interface OrderSummary {
  id: number;
  order_number: number;
  stage: StageInfo | null;
  assignee: AssigneeInfo | null;
}

export type AssistantMode = 'active' | 'shadowing' | 'inactive';

// Thread API Types
export interface ThreadCustomerDetails {
  email?: string;
  phone?: string;
  location?: string;
  username?: string;
  customer_fields?: Record<string, string | number | boolean | null>;
}

export interface ThreadListItem {
  thread_id: string;
  company_id: number;
  history_synced?: boolean;
  conversation_id?: string;
  customer_id?: number | string;
  customer_name?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count?: number;
  assistant_mode?: AssistantMode;
  billing_status?: 'active' | 'billing_hold';
  channel_type?: string;
  connector_transport_type?: string | null;
  state?: string;
  metadata?: Record<string, unknown>;
  active_order: OrderSummary | null;
  details?: ThreadCustomerDetails;
}

export interface ThreadsResponse {
  items: ThreadListItem[];
  total: number;
  limit?: number;
  offset?: number;
}

// Message API Types
export interface ApiMessage {
  id?: string;
  message_id?: string;
  role: 'user' | 'assistant' | 'manager' | 'system';
  content: string;
  transcription?: string | null;
  created_at?: string;
  sender_name?: string;
  author?: { first_name?: string; last_name?: string };
  type?: 'text' | 'internal_note' | 'system_event';
  is_note?: boolean;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, unknown>;
  artifact_ids?: string[];
}

export interface MessagesResponse {
  items: ApiMessage[];
  total: number;
  limit?: number;
  offset?: number;
}

export type AttachmentType = 'image' | 'audio' | 'voice' | 'video' | 'document';

export interface AttachmentDescriptor {
  artifact_id: string;
  type: AttachmentType;
  mime_type: string;
  caption?: string;
}

export interface ArtifactUploadResponse {
  artifact_id: string;
}

export interface ArtifactPresignedUrlResponse {
  url: string;
  expires_in: number;
}

export interface ArtifactPresignedUploadRequest {
  file_type: AttachmentType;
  filename: string;
  content_type: string;
  byte_size: number;
}

export interface ArtifactPresignedUploadResponse {
  artifact_id: string;
  upload_url: string;
  expires_in: number;
  required_headers: Record<string, string>;
}

export interface CreateMessageRequest {
  role: 'manager';
  content: string;
  is_note: boolean;
  pause_assistant: boolean;
  attachments?: AttachmentDescriptor[];
}

// Customer API Types
export interface CustomerFieldSchema {
  name: string;
  display_name: string | null;
  type: string;
  required: boolean;
  options?: Array<{ id: number; value: string }>;
}

export interface Customer {
  id: string;
  customer_id?: number;
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  username?: string;
  avatar_url?: string;
  customer_fields: Record<string, string | number | boolean | null>;
  fields_schema?: CustomerFieldSchema[];
  rejected?: boolean;
  rejection_reason?: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
}

// Company API Types
export interface CompanySpecification {
  stages_config?: Array<{ id: string; name: string; description?: string }>;
  stages?: Array<{ id: string; name: string; description?: string }>;
}

export interface CompanyDetailResponse {
  id: number;
  name: string;
  description: string;
  rules: string;
  tone_of_voice: string;
  assistant_name: string;
  qualification_workflow: string;
  qualification_examples: string;
  collection_name: string;
  stages_config: Array<Record<string, unknown>>;
  target_stage_id: number | null;
}

export type AgentReadinessSeverity = 'blocker' | 'advisory';

export type AgentReadinessCompanyNameItem = {
  type: 'company_name';
  severity: 'blocker';
  ok: boolean;
};

export type AgentReadinessCompanyDescriptionItem = {
  type: 'company_description';
  severity: 'blocker';
  ok: boolean;
};

export type AgentReadinessAssistantNameItem = {
  type: 'assistant_name';
  severity: 'blocker';
  ok: boolean;
};

export type AgentReadinessTransportConnectorItem = {
  type: 'transport_connector';
  severity: 'blocker';
  ok: boolean;
};

export type AgentReadinessTargetStageItem = {
  type: 'target_stage';
  severity: 'blocker';
  ok: boolean;
};

export type AgentReadinessItem =
  | AgentReadinessCompanyNameItem
  | AgentReadinessCompanyDescriptionItem
  | AgentReadinessAssistantNameItem
  | AgentReadinessTransportConnectorItem
  | AgentReadinessTargetStageItem;

export interface AgentReadinessResponse {
  company_id: number;
  is_ready_to_deploy: boolean;
  items: AgentReadinessItem[];
}

export interface KnowledgeTopic {
  topic_id: string;
  title: string;
  description: string;
}

export interface CompanyPatchPayload {
  target_stage_id?: number | null;
  knowledge_index?: KnowledgeTopic[] | null;
  knowledge_chunks?: Record<string, string> | null;
}

export interface CompanyMetricsSnapshotItem {
  company_id: number;
  report_date: string;
  orders_with_assistant_activity_count: number;
  orders_reached_target_count: number | null;
  conversion_pct: string | number | null;
  target_stage_id_snapshot: number | null;
  target_stage_name_snapshot: string | null;
  computed_at: string;
}

export interface CompanyMetricsSnapshotsPage {
  items: CompanyMetricsSnapshotItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CompanyMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
  work_schedule?: Record<string, unknown>;
  is_available?: boolean;
}

export type FieldLevel = 'customer' | 'order';

export interface CompanyField {
  id: number;
  name: string;
  display_name?: string;
  question?: string;
  type: string;
  required: boolean;
  level: FieldLevel;
  is_system: boolean;
  category_id?: number;
  product_id?: number;
  options?: Array<{ id: number; value: string }>;
}

export interface CompanyFieldsResponse {
  items?: CompanyField[];
}

// Order API Types
export interface OrderResponse {
  id: number;
  order_number: number;
  name: string | null;
  customer: CustomerInfo;
  assignee: AssigneeInfo | null;
  stage: StageInfo | null;
  order_fields: Record<string, unknown>;
  extra_fields: Record<string, string | number | boolean | null>;
  initial_channel: string | null;
  result: string | null;
  frozen: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  thread_id?: string | null;
  assistant_mode?: AssistantMode | null;
}

export interface OrderLogEntry {
  id: number;
  type: string;
  author: AssigneeInfo | null;
  data: Record<string, unknown>;
  created_at: string;
}

// Stage API Types
export interface StageTemplate {
  id: number;
  company_id: number;
  name: string;
  color: string | null;
  position: number;
  is_final: boolean;
  auto_close: boolean;
  is_system: boolean;
  transition_condition: Record<string, unknown> | null;
}

export interface CreateStageRequest {
  name: string;
  color?: string;
  position?: number;
  is_final?: boolean;
  auto_close?: boolean;
  transition_condition?: Record<string, unknown>;
}

export interface UpdateStageRequest {
  name?: string;
  color?: string;
  is_final?: boolean;
  auto_close?: boolean;
  transition_condition?: Record<string, unknown>;
}

// Ping Rule API Types (Stage-Based Auto-Pings)
export type PingContentType = 'ai_generated' | 'static';

/** Must match backend `MAX_PING_ATTACHMENTS`. */
export const MAX_PING_ATTACHMENTS = 20;

export interface PingRule {
  id: number;
  company_id: number;
  stage_id: number;
  position: number;
  delay_seconds: number;
  condition: Record<string, unknown> | null;
  content_type: PingContentType;
  static_content: string | null;
  prompt_override: string | null;
  attachments: AttachmentDescriptor[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePingRuleRequest {
  position: number;
  delay_seconds: number;
  content_type: PingContentType;
  static_content?: string | null;
  prompt_override?: string | null;
  condition?: Record<string, unknown> | null;
  attachments?: AttachmentDescriptor[];
  is_active?: boolean;
}

export interface UpdatePingRuleRequest {
  delay_seconds?: number;
  content_type?: PingContentType;
  static_content?: string | null;
  prompt_override?: string | null;
  condition?: Record<string, unknown> | null;
  attachments?: AttachmentDescriptor[];
  is_active?: boolean;
}

// Condition Report Types (from backend evaluate_condition_detailed)
export interface ConditionClauseApi {
  type: 'clause';
  description: string;
  field: string | null;
  operator: string;
  expected: unknown;
  actual: unknown | null;
  result: boolean;
}

export interface ConditionGroupApi {
  type: 'group';
  logic: string;
  children: ConditionNodeApi[];
  result: boolean;
}

export type ConditionNodeApi = ConditionClauseApi | ConditionGroupApi;

export interface ConditionReportApi {
  overall: boolean;
  root: ConditionGroupApi;
}

export interface NextStageInfo {
  stage: StageInfo;
  missing_fields: string[];
  condition_status: 'met' | 'partial' | 'blocked';
  condition_report: ConditionReportApi | null;
}

export interface OrderStageRequirementsResponse {
  current_stage: StageInfo | null;
  next_stages: NextStageInfo[];
}

// Task API Types
export interface TaskResponse {
  id: number;
  company_id: number;
  order_id: number;
  title: string;
  description: string | null;
  type: string;
  due_date: string;
  assignee_id: number | null;
  auto_action: string | null;
  ping_rule_id: number | null;
  completed: boolean;
  completed_at: string | null;
  completed_by_type: string | null;
  cancelled_at: string | null;
  is_overdue: boolean;
  attempt_count: number;
  failure_reason: string | null;
  created_at: string;
  created_by_id: number | null;
}

export interface CreateOrderTaskRequest {
  title: string;
  description?: string;
  type: string;
  due_date: string;
  assignee_id?: number;
  auto_action?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  due_date?: string;
  assignee_id?: number;
}

// Prompt Addon API Types
export interface PromptAddon {
  id: number;
  company_id: number;
  name: string;
  qualification_workflow: string;
  qualification_examples: string;
}

export interface CreatePromptAddonRequest {
  name: string;
  qualification_workflow: string;
  qualification_examples: string;
}

export interface UpdatePromptAddonRequest {
  name?: string;
  qualification_workflow?: string;
  qualification_examples?: string;
}

// CompanyUser Schedule API Types
export interface TimeSlot {
  start: string;
  end: string;
}

export interface WeeklySchedule {
  mon: TimeSlot[];
  tue: TimeSlot[];
  wed: TimeSlot[];
  thu: TimeSlot[];
  fri: TimeSlot[];
  sat: TimeSlot[];
  sun: TimeSlot[];
}

export interface WorkSchedule {
  version: number;
  timezone: string;
  weekly: WeeklySchedule;
}

export interface CompanyUserSchedule {
  work_schedule: WorkSchedule | null;
  is_available: boolean;
  schedule_description: string | null;
  is_working_now: boolean;
  next_available_at: string | null;
  next_available_at_local: string | null;
  next_available_timezone: string | null;
}

// Product API Types
export interface ProductBackend {
  id: number;
  name: string;
  description: string;
  category_id: number | null;
  attributes: Record<string, unknown>;
}

export interface ToolItemResponse {
  name: string;
  description: string;
}

export interface ToolGroupResponse {
  group: string;
  tools: ToolItemResponse[];
}

export interface CategoryBackend {
  id: number;
  name: string;
  description?: string;
  rules?: string;
  workflow?: string;
  company_id: number;
}

export interface ProductsResponse {
  products: ProductBackend[];
  categories: CategoryBackend[];
}

export interface CategoryRequest {
  name: string;
  company_id: number;
}

export interface ProductRequest {
  company_id: number;
  name: string;
  description: string;
  category_id: number | null;
  attributes: Record<string, unknown>;
}

// Integration API Types
export interface CredentialFieldSchema {
  key: string;
  label: string;
  field_type: string;
  required: boolean;
  placeholder: string;
}

export interface ConfigFieldSchema {
  key: string;
  label: string;
  field_type: string;
  required: boolean;
  placeholder: string;
  default: unknown;
}

export interface ProviderCatalogEntry {
  provider_type: string;
  display_name: string;
  description: string;
  logo_url: string;
  supported_capabilities: string[];
  credential_fields: CredentialFieldSchema[];
  config_fields: ConfigFieldSchema[];
}

export interface IntegrationCreate {
  provider_type: string;
  credentials: Record<string, unknown>;
  config: Record<string, unknown>;
  enabled_capabilities: string[];
  enabled: boolean;
}

export interface IntegrationUpdate {
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  enabled_capabilities?: string[];
  enabled?: boolean;
}

export interface IntegrationResponse {
  id: number;
  company_id: number;
  provider_type: string;
  config: Record<string, unknown>;
  enabled_capabilities: string[];
  enabled: boolean;
}

// Connector Capability Catalog
export type ConnectorCapability =
  | 'inbound_text'
  | 'inbound_voice'
  | 'inbound_audio'
  | 'inbound_image'
  | 'inbound_video'
  | 'inbound_document'
  | 'outbound_text'
  | 'outbound_media'
  | 'history_sync';

export interface ConnectorTypeCatalogEntry {
  connector_type: string;
  display_name: string;
  description: string;
  managed: boolean;
  supported_capabilities: ConnectorCapability[];
}

// Connectors API Types
export interface TelegramConnectorConfig {
  bot_token: string;
  mode?: 'auto' | 'webhook' | 'polling';
  webhook_secret?: string;
  webhook_path?: string;
}

export interface WappiConnectorConfig {
  wappi_token: string;
  wappi_profile_id: string;
}

export type ConnectorConfig = TelegramConnectorConfig | WappiConnectorConfig | Record<string, string>;

export interface Connector {
  id: number;
  company_id: number;
  connector_id?: string;
  type: 'telegram' | 'wappi' | 'custom';
  channel_type: string;
  display_name: string;
  name?: string;
  enabled: boolean;
  is_active?: boolean;
  config: ConnectorConfig | Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: 'active' | 'disconnected' | 'error';
  prompt_addon_id: number | null;
  debounce_window_seconds?: number;
  debounce_storage_key_template?: string;
  sync_status?: string;
  sync_progress?: Record<string, unknown>;
  sync_started_at?: string | null;
  sync_completed_at?: string | null;
}

export interface CreateConnectorRequest {
  company_id: number;
  connector_id: string;
  type: 'telegram' | 'wappi' | 'custom';
  channel_type: string;
  display_name: string;
  config: ConnectorConfig;
  enabled?: boolean;
}

// User API Types
export interface UserCompanyInfo {
  id: number;
  company_id: number;
  company_name: string;
  role: string;
}

export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  role?: string;
  companies: UserCompanyInfo[];
}

// Form API Types
export interface FormTemplateField {
  id: number;
  field_id: number;
  field_level: FieldLevel;
  position: number;
}

export interface FormTemplate {
  id: number;
  public_id: string;
  name: string;
  enabled: boolean;
  has_api_key: boolean;
  contact_field_id: number;
  template_fields: FormTemplateField[];
  created_at: string;
  updated_at: string;
}

export interface FormTemplateFieldCreate {
  field_id: number;
  position: number;
}

export interface FormTemplateCreate {
  name: string;
  contact_field_id: number;
  template_fields: FormTemplateFieldCreate[];
}

export interface FormTemplatePatch {
  name?: string;
  enabled?: boolean;
  contact_field_id?: number;
  template_fields?: FormTemplateFieldCreate[];
}

export interface FormSubmission {
  id: number;
  customer_id: number | null;
  order_id: number | null;
  raw_fields: Record<string, unknown>;
  utm_data: Record<string, string> | null;
  ip_address: string | null;
  created_at: string;
}

export interface RegenerateKeyResponse {
  api_key: string;
}

// Public Form Types (for rendering public forms)
export type AnswerType = 'string' | 'number' | 'boolean' | 'enum';

export interface PublicFieldOption {
  id: number;
  value: string;
}

export interface PublicField {
  id: number;
  name: string;
  display_name: string | null;
  question: string;
  answer_type: AnswerType;
  required: boolean;
  options: PublicFieldOption[];
  is_contact_field: boolean;
}

export interface PublicFormResponse {
  id: number;
  name: string;
  company_name: string;
  fields: PublicField[];
}

export interface CaptureSubmitRequest {
  fields: Record<string, string | number | boolean>;
  utm?: Record<string, string>;
}

export interface CaptureSubmitResponse {
  customer_id: number;
  order_id: number;
  order_number: number;
}

export interface BalanceResponse {
  company_id: number;
  balance: number;
  balance_warning: boolean;
  updated_at: string;
}

export interface TopUpRequest {
  amount: number;
  comment?: string;
  operator_id?: number;
}

export interface TopUpResponse {
  balance_id: number;
  ledger_entry_id: number;
  new_balance: number;
  amount_added: number;
}

export interface ReactivateThreadsRequest {
  thread_ids: string[];
}

export interface ChargeResult {
  success: boolean;
  new_balance: number;
  ledger_entry_id: number | null;
  already_charged: boolean;
  billing_status: 'active' | 'billing_hold';
}

export interface ReactivateThreadsResponse {
  results: Record<string, ChargeResult>;
  new_balance: number;
}

export interface LedgerEntry {
  id: number;
  company_id: number;
  operation_type: 'top_up' | 'charge';
  amount: number;
  timestamp: string;
  initiated_by: 'system' | 'operator' | 'admin';
  operator_id: number | null;
  comment: string | null;
  thread_id: number | null;
  channel_type: string | null;
  conversation_id: string | null;
}

export interface LedgerListResponse {
  entries: LedgerEntry[];
  total: number;
  limit: number;
  offset: number;
}

// Notification API Types
export type NotificationType = 'handoff_assigned';

export interface NotificationResponse {
  id: number;
  company_id: number;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

export interface NotificationRecipientResponse {
  id: number;
  notification: NotificationResponse;
  is_read: boolean;
  read_at: string | null;
}

export interface NotificationListResponse {
  items: NotificationRecipientResponse[];
  total: number;
  unread_count: number;
}

export interface CompanyNotificationSummary {
  company_id: number;
  unread_count: number;
}
