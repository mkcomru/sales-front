// API Endpoint Constants

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
  },

  // Users
  USERS: {
    ME: '/api/v1/users/me',
    MY_THREADS: '/api/v1/users/me/threads',
  },

  // Companies
  COMPANIES: {
    LIST: '/api/v1/companies',
    CREATE: '/api/v1/companies',
    BY_ID: (id: number) => `/api/v1/companies/${id}`,
    AGENT_READINESS: (id: number) => `/api/v1/companies/${id}/agent-readiness`,
    COMPANY_METRICS_SNAPSHOTS: (companyId: number) =>
      `/api/v1/companies/${companyId}/company-metrics/snapshots`,
    CONFIG: (id: number) => `/api/v1/companies/${id}/config`,
    FIELDS: (id: number) => `/api/v1/companies/${id}/fields`,
    FIELDS_BY_ID: (companyId: number, fieldId: number) => `/api/v1/companies/${companyId}/fields/${fieldId}`,
    PRODUCTS: (id: number) => `/api/v1/companies/${id}/products`,
    THREADS: (id: number) => `/api/v1/companies/${id}/threads`,
    CONNECTORS: (id: number) => `/api/v1/companies/${id}/connectors`,
    MEMBERS: (id: number) => `/api/v1/companies/${id}/members`,
    CONNECTOR_SYNC_MORE_CHATS: (companyId: number, connectorId: string) =>
      `/api/v1/companies/${companyId}/connectors/${encodeURIComponent(connectorId)}/sync/more-chats`,
    BILLING: {
      BALANCE: (id: number) => `/api/v1/companies/${id}/billing/balance`,
      TOP_UP: (id: number) => `/api/v1/companies/${id}/billing/top-up`,
      LEDGER: (id: number) => `/api/v1/companies/${id}/billing/ledger`,
      BILLING_HOLD_THREADS: (id: number) => `/api/v1/companies/${id}/billing/threads/billing-hold`,
      REACTIVATE_THREAD: (id: number, threadId: string) => `/api/v1/companies/${id}/billing/threads/${threadId}/reactivate`,
      REACTIVATE_THREADS: (id: number) => `/api/v1/companies/${id}/billing/threads/reactivate`,
    },
  },

  // Artifacts (voice, audio, images) — direct path to avoid route conflicts
  ARTIFACTS: {
    BY_ID: (companyId: number, artifactId: string) =>
      `/api/v1/artifacts/by-company/${companyId}/${artifactId}`,
    UPLOAD: (companyId: number) =>
      `/api/v1/companies/${companyId}/artifacts/upload`,
    VOICE_UPLOAD: (companyId: number) =>
      `/api/v1/companies/${companyId}/artifacts/voice-upload`,
    PRESIGNED_UPLOAD: (companyId: number) =>
      `/api/v1/companies/${companyId}/artifacts/presigned-upload`,
    PRESIGNED_GET: (companyId: number) =>
      `/api/v1/companies/${companyId}/artifacts/presigned-url`,
  },

  // Threads
  THREADS: {
    BY_ID: (companyId: number, threadId: string) =>
      `/api/v1/companies/${companyId}/threads/${threadId}`,
    SYNC_HISTORY: (companyId: number, threadId: string) =>
      `/api/v1/companies/${companyId}/threads/${threadId}/sync-history`,
    MESSAGES: (companyId: number, threadId: string) =>
      `/api/v1/companies/${companyId}/threads/${threadId}/messages`,
    CONTROL: {
      STOP_ASSISTANT: (companyId: number, threadId: string) =>
        `/api/v1/companies/${companyId}/threads/${threadId}/control/stop_assistant`,
      RESUME_ASSISTANT: (companyId: number, threadId: string) =>
        `/api/v1/companies/${companyId}/threads/${threadId}/control/resume_assistant`,
    },
  },

  // Customers
  CUSTOMERS: {
    BY_ID: (companyId: number, customerId: string) =>
      `/api/v1/companies/${companyId}/customers/${customerId}`,
    FIELDS: (companyId: number, customerId: string) =>
      `/api/v1/companies/${companyId}/customers/${customerId}/fields`,
    NOTES: (companyId: number, customerId: string) =>
      `/api/v1/companies/${companyId}/customers/${customerId}/notes`,
  },

  // Orders
  ORDERS: {
    LIST: (companyId: number) => `/api/v1/companies/${companyId}/orders`,
    BY_ID: (companyId: number, orderId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}`,
    ASSIGNEE: (companyId: number, orderId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/assignee`,
    CLOSE: (companyId: number, orderId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/close`,
    FROZEN: (companyId: number, orderId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/frozen`,
    LOGS: (companyId: number, orderId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/logs`,
    RECALCULATE: (companyId: number, orderId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/recalculate-stage`,
    STAGE_REQUIREMENTS: (companyId: number, orderId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/stage-requirements`,
    CUSTOMER_ORDERS: (companyId: number, customerId: number) =>
      `/api/v1/companies/${companyId}/orders/customers/${customerId}/orders`,
  },

  // Stages
  STAGES: {
    LIST: (companyId: number) => `/api/v1/companies/${companyId}/stages`,
    BY_ID: (companyId: number, stageId: number) =>
      `/api/v1/companies/${companyId}/stages/${stageId}`,
    REORDER: (companyId: number) => `/api/v1/companies/${companyId}/stages/reorder`,
    RECALCULATE: (companyId: number) => `/api/v1/companies/${companyId}/stages/recalculate`,
    PINGS: (companyId: number, stageId: number) =>
      `/api/v1/companies/${companyId}/stages/${stageId}/pings`,
  },

  // Ping Rules (stage-scoped)
  PINGS: {
    BY_ID: (companyId: number, pingId: number) =>
      `/api/v1/companies/${companyId}/pings/${pingId}`,
  },

  // Tasks
  TASKS: {
    ORDER_TASKS: (companyId: number, orderId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/tasks`,
    TASK_BY_ID: (companyId: number, orderId: number, taskId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/tasks/${taskId}`,
    COMPLETE: (companyId: number, orderId: number, taskId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/tasks/${taskId}/complete`,
    CANCEL: (companyId: number, orderId: number, taskId: number) =>
      `/api/v1/companies/${companyId}/orders/${orderId}/tasks/${taskId}/cancel`,
    MY_TASKS: (companyId: number) => `/api/v1/companies/${companyId}/my-tasks`,
    ALL_COMPANY_TASKS: (companyId: number) => `/api/v1/companies/${companyId}/tasks`,
  },

  // Prompt Addons
  PROMPT_ADDONS: {
    LIST: (companyId: number) => `/api/v1/companies/${companyId}/prompt-addons`,
    BY_ID: (companyId: number, addonId: number) =>
      `/api/v1/companies/${companyId}/prompt-addons/${addonId}`,
  },

  // Company Users
  COMPANY_USERS: {
    UPDATE: (companyUserId: number) => `/api/v1/company-users/${companyUserId}`,
    SCHEDULE: (companyUserId: number) => `/api/v1/company-users/${companyUserId}/schedule`,
  },

  // Categories
  CATEGORIES: {
    LIST: (companyId: number) => `/api/v1/companies/${companyId}/categories`,
    CREATE: (companyId: number) => `/api/v1/companies/${companyId}/categories`,
    BY_ID: (companyId: number, categoryId: number) =>
      `/api/v1/companies/${companyId}/categories/${categoryId}`,
    UPDATE: (companyId: number, categoryId: number) =>
      `/api/v1/companies/${companyId}/categories/${categoryId}`,
    DELETE: (companyId: number, categoryId: number) =>
      `/api/v1/companies/${companyId}/categories/${categoryId}`,
  },

  // Products
  PRODUCTS: {
    LIST: (companyId: number) => `/api/v1/products?company_id=${companyId}`,
    CREATE: '/api/v1/products',
    BY_ID: (id: number) => `/api/v1/products/${id}`,
    UPDATE: (id: number) => `/api/v1/products/${id}`,
    DELETE: (id: number) => `/api/v1/products/${id}`,
  },

  // Connectors (Transport)
  CONNECTORS: {
    LIST: '/api/v1/transport/connectors',
    CREATE: '/api/v1/transport/connectors',
    CATALOG: '/api/v1/transport/catalog',
    BY_ID: (connectorDbId: number) => `/api/v1/transport/connectors/${connectorDbId}`,
    UPDATE: (connectorDbId: number) => `/api/v1/transport/connectors/${connectorDbId}`,
    DELETE: (connectorDbId: number) => `/api/v1/transport/connectors/${connectorDbId}`,
    API_KEYS: {
      LIST: (connectorDbId: number) => `/api/v1/transport/connectors/${connectorDbId}/api-keys`,
      CREATE: (connectorDbId: number) => `/api/v1/transport/connectors/${connectorDbId}/api-keys`,
      DELETE: (connectorDbId: number, keyId: number) => `/api/v1/transport/connectors/${connectorDbId}/api-keys/${keyId}`,
    },
  },

  // Integrations
  INTEGRATIONS: {
    LIST: (companyId: number) => `/api/v1/companies/${companyId}/integrations`,
    CREATE: (companyId: number) => `/api/v1/companies/${companyId}/integrations`,
    BY_ID: (companyId: number, integrationId: number) => `/api/v1/companies/${companyId}/integrations/${integrationId}`,
    UPDATE: (companyId: number, integrationId: number) => `/api/v1/companies/${companyId}/integrations/${integrationId}`,
    DELETE: (companyId: number, integrationId: number) => `/api/v1/companies/${companyId}/integrations/${integrationId}`,
    CATALOG: (companyId: number) => `/api/v1/companies/${companyId}/integrations/catalog`,
  },

  // Tools
  TOOLS: {
    AVAILABLE: (companyId: number) => `/api/v1/companies/${companyId}/tools/available`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: (companyId: number) => `/api/v1/companies/${companyId}/notifications`,
    UNREAD_COUNT: (companyId: number) => `/api/v1/companies/${companyId}/notifications/unread-count`,
    READ: (companyId: number, recipientId: number) =>
      `/api/v1/companies/${companyId}/notifications/${recipientId}/read`,
    READ_ALL: (companyId: number) => `/api/v1/companies/${companyId}/notifications/read-all`,
    SUMMARY: '/api/v1/notifications/summary',
  },

  // WebSocket
  WS: {
    TICKET: (companyId: number) => `/api/v1/companies/${companyId}/ws-ticket`,
    COMPANY: (companyId: number) => `/api/v1/ws/companies/${companyId}`,
  },

  // Forms (Web Form Capture)
  FORMS: {
    LIST: (companyId: number) => `/api/v1/companies/${companyId}/forms`,
    CREATE: (companyId: number) => `/api/v1/companies/${companyId}/forms`,
    BY_ID: (companyId: number, formId: number) => `/api/v1/companies/${companyId}/forms/${formId}`,
    UPDATE: (companyId: number, formId: number) => `/api/v1/companies/${companyId}/forms/${formId}`,
    DELETE: (companyId: number, formId: number) => `/api/v1/companies/${companyId}/forms/${formId}`,
    REGENERATE_KEY: (companyId: number, formId: number) => `/api/v1/companies/${companyId}/forms/${formId}/regenerate-key`,
    SUBMISSIONS: (companyId: number, formId: number) => `/api/v1/companies/${companyId}/forms/${formId}/submissions`,
    SUBMIT: (companyId: number, formId: number) => `/api/v1/companies/${companyId}/forms/${formId}/submit`,
    PUBLIC_GET: (publicId: string) => `/api/v1/forms/${publicId}`,
    PUBLIC_SUBMIT: (publicId: string) => `/api/v1/forms/${publicId}/submit`,
    KEY_SCHEMA: '/api/v1/forms/key/schema',
    KEY_CAPTURE: '/api/v1/forms/key/capture',
  },
} as const;
