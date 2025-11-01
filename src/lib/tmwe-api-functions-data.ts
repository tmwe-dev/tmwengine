export interface ApiFunction {
  name: string;
  description: string;
  endpoint: string;
  method?: string;
  exampleCode: string;
  exampleResponse: string;
}

// ============================================
// EMAIL MESSAGE HANDLERS (13 handlers)
// ============================================
export const EMAIL_MESSAGE_HANDLERS: ApiFunction[] = [
  {
    name: 'get_messages',
    description: 'Retrieve list of email messages with pagination and filtering options',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'get_messages',
      folder: 'INBOX',
      page: 1,
      limit: 50,
      sort: 'date',
      order: 'DESC',
      include_attachments: false,
      format: 'text'
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "messages": [
    {
      "uid": 12345,
      "subject": "Meeting tomorrow",
      "from": "sender@example.com",
      "date": "2025-11-01",
      "size": "2048",
      "seen": 0,
      "flagged": 0
    }
  ],
  "from": 0,
  "to": 50,
  "total": 150,
  "duration": 245.5
}`
  },
  {
    name: 'get_message',
    description: 'Get complete details of a specific email message including body and attachments',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'get_message',
      uid: "12345",
      folder: 'INBOX',
      include_attachments: true,
      format: 'html',
      mark_as_read: true
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": {
    "uid": 12345,
    "subject": "Meeting tomorrow",
    "from": "sender@example.com",
    "body": "<p>Full email body content...</p>",
    "attachments": [
      {
        "filename": "document.pdf",
        "size": 1024
      }
    ]
  }
}`
  },
  {
    name: 'search_messages',
    description: 'Search email messages by query string, date range, and other criteria',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'search_messages',
      query: "invoice",
      folder: 'INBOX',
      from_date: "2025-01-01",
      to_date: "2025-12-31"
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "results": [
    {
      "uid": 98765,
      "subject": "Invoice #2025-001",
      "from": "billing@company.com",
      "date": "2025-10-15"
    }
  ],
  "total": 42,
  "duration": 312.8
}`
  },
  {
    name: 'send_message',
    description: 'Send a new email message with optional CC, BCC, and attachments',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'send_message',
      to: ["recipient@example.com"],
      subject: "Test Email",
      body: "<p>This is a test email</p>",
      body_type: "html",
      cc: ["cc@example.com"],
      bcc: [],
      attachments: []
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Email sent successfully",
  "message_id": "<unique-id@server.com>",
  "duration": 450.2
}`
  },
  {
    name: 'reply_message',
    description: 'Reply to an existing email message, optionally replying to all recipients',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'reply_message',
      uid: "6633",
      body: "This is my reply",
      body_html: "<p>This is my reply</p>",
      reply_all: false,
      attachments: []
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Reply sent successfully",
  "message_id": "<reply-id@server.com>",
  "duration": 380.5
}`
  },
  {
    name: 'forward_message',
    description: 'Forward an existing email message to new recipients',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'forward_message',
      uid: "6633",
      to: ["recipient@example.com"],
      body: "FYI - see forwarded message below",
      body_html: "",
      cc: [],
      bcc: [],
      attachments: []
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Email forwarded successfully",
  "message_id": "<forward-id@server.com>",
  "duration": 410.3
}`
  },
  {
    name: 'delete_email',
    description: 'Delete a single email permanently (cannot be undone)',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'delete_email',
      uid: 123
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Email deleted permanently",
  "duration": 125.7
}`
  },
  {
    name: 'move_to_trash',
    description: 'Move a single email to trash folder (can be recovered)',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'move_to_trash',
      uid: 123
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Email moved to trash",
  "duration": 98.4
}`
  },
  {
    name: 'delete_messages',
    description: 'Delete multiple emails permanently in bulk (cannot be undone)',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'delete_messages',
      uids: [123, 456, 789]
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "3 emails deleted permanently",
  "deleted_count": 3,
  "duration": 234.1
}`
  },
  {
    name: 'move_messages_to_trash',
    description: 'Move multiple emails to trash folder in bulk (can be recovered)',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'move_messages_to_trash',
      uids: [123, 456, 789]
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "3 emails moved to trash",
  "moved_count": 3,
  "duration": 189.3
}`
  },
  {
    name: 'move_messages',
    description: 'Move multiple messages to a different folder',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'move_messages',
      uids: [123, 456, 789],
      destination_folder: 'Archive'
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "3 emails moved to Archive",
  "moved_count": 3,
  "duration": 201.5
}`
  },
  {
    name: 'mark_messages',
    description: 'Mark multiple messages as read, unread, or flagged',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'mark_messages',
      uids: [123, 456, 789],
      mark_as: 'read'  // or 'unread', 'flagged', 'unflagged'
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "3 emails marked as read",
  "marked_count": 3,
  "duration": 145.2
}`
  },
  {
    name: 'get_attachments',
    description: 'Get all attachments for a specific email message',
    endpoint: '/email_message',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_message',
    data: {
      handler: 'get_attachments',
      uid: "12345",
      folder: 'INBOX'
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "attachments": [
    {
      "filename": "document.pdf",
      "size": 102400,
      "mime_type": "application/pdf",
      "attachment_id": "att_001"
    }
  ],
  "duration": 87.6
}`
  }
];

// ============================================
// EMAIL FOLDER HANDLERS (5 handlers)
// ============================================
export const EMAIL_FOLDER_HANDLERS: ApiFunction[] = [
  {
    name: 'get_folders',
    description: 'Retrieve list of all email folders in the mailbox',
    endpoint: '/email_folder',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_folder',
    data: { 
      handler: 'get_folders' 
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "folders": [
    { "name": "INBOX", "count": 150, "unread": 25 },
    { "name": "Sent", "count": 42, "unread": 0 },
    { "name": "Archive", "count": 380, "unread": 0 },
    { "name": "Drafts", "count": 5, "unread": 0 }
  ],
  "duration": 156.3
}`
  },
  {
    name: 'get_folder_info',
    description: 'Get detailed information about a specific folder',
    endpoint: '/email_folder',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_folder',
    data: { 
      handler: 'get_folder_info',
      folder_name: 'INBOX'
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "folder": {
    "name": "INBOX",
    "total_messages": 150,
    "unread_messages": 25,
    "size_bytes": 52428800,
    "last_sync": "2025-11-01 15:30:00"
  },
  "duration": 98.7
}`
  },
  {
    name: 'create_folder',
    description: 'Create a new email folder in the mailbox',
    endpoint: '/email_folder',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_folder',
    data: { 
      handler: 'create_folder',
      folder_name: 'Archive 2025',
      parent_folder: 'INBOX'  // optional
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Folder 'Archive 2025' created successfully",
  "folder_name": "Archive 2025",
  "duration": 123.4
}`
  },
  {
    name: 'delete_folder',
    description: 'Delete an email folder permanently (folder must be empty)',
    endpoint: '/email_folder',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_folder',
    data: { 
      handler: 'delete_folder',
      folder_name: 'Old Archive'
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Folder 'Old Archive' deleted successfully",
  "duration": 145.8
}`
  },
  {
    name: 'rename_folder',
    description: 'Rename an existing email folder',
    endpoint: '/email_folder',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_folder',
    data: { 
      handler: 'rename_folder',
      old_name: 'Archive 2025',
      new_name: 'Archive 2025 Q1'
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Folder renamed successfully",
  "old_name": "Archive 2025",
  "new_name": "Archive 2025 Q1",
  "duration": 112.5
}`
  }
];

// ============================================
// EMAIL RULES HANDLERS (6 handlers)
// ============================================
export const EMAIL_RULES_HANDLERS: ApiFunction[] = [
  {
    name: 'email_rule (GET)',
    description: 'Retrieve email rules with optional filters (by ID, show all, pagination)',
    endpoint: '/email_rule',
    method: 'GET',
    exampleCode: `// Get all active rules with nested components and actions
const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_rule',
    method: 'GET',
    data: { 
      show_all: 1  // or use 'id: 123' for specific rule
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Auto-archive newsletters",
      "description": "Move newsletter emails to archive",
      "is_active": 1,
      "priority": 10,
      "match_type": "all",
      "components": [
        {
          "id": 1,
          "field_name": "from",
          "operator": "contains",
          "value": "newsletter@"
        }
      ],
      "actions": [
        {
          "id": 1,
          "action_type": "move_to_folder",
          "action_value": "Archive"
        }
      ]
    }
  ]
}`
  },
  {
    name: 'email_rule (POST - Create)',
    description: 'Create a new email rule (rule only, components and actions separate)',
    endpoint: '/email_rule',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_rule',
    data: {
      item: {
        name: "Spam filter rule",
        description: "Move spam emails to trash",
        is_active: 1,
        priority: 5,
        match_type: "any"
      }
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Email rule created successfully",
  "data": {
    "id": 42,
    "name": "Spam filter rule",
    "is_active": 1,
    "priority": 5
  }
}`
  },
  {
    name: 'email_rule (POST - Update)',
    description: 'Update an existing email rule (include id in item)',
    endpoint: '/email_rule',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_rule',
    data: {
      item: {
        id: 42,
        name: "Updated rule name",
        is_active: 0  // disable rule
      }
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Email rule updated successfully",
  "data": {
    "id": 42,
    "name": "Updated rule name",
    "is_active": 0
  }
}`
  },
  {
    name: 'email_rule (POST - Delete)',
    description: 'Delete an email rule permanently (use action: delete)',
    endpoint: '/email_rule',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_rule',
    data: {
      action: "delete",
      item: { id: 42 }
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Email rule deleted successfully"
}`
  },
  {
    name: 'email_rule_bulk',
    description: 'Create complete rule with components and actions in ONE atomic operation (RECOMMENDED)',
    endpoint: '/email_rule_bulk',
    method: 'POST',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_rule_bulk',
    data: {
      item: {
        name: "Auto-archive newsletters",
        description: "Move newsletter emails to archive",
        is_active: 1,
        priority: 10,
        match_type: "all",
        components: [
          {
            field_name: "from",
            operator: "contains",
            value: "newsletter@",
            is_case_sensitive: 0
          }
        ],
        actions: [
          {
            action_type: "move_to_folder",
            action_value: "Archive"
          }
        ]
      }
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "message": "Email rule created successfully with 1 components and 1 actions",
  "data": {
    "rule_id": 15,
    "components_created": 1,
    "actions_created": 1
  }
}`
  },
  {
    name: 'email_rule_action (GET - Metadata)',
    description: 'Get metadata about available action types for building dynamic UIs',
    endpoint: '/email_rule_action',
    method: 'GET',
    exampleCode: `const { data } = await supabase.functions.invoke('tmwe-api-proxy', {
  body: {
    endpoint: '/email_rule_action',
    method: 'GET',
    data: { 
      metadata: true  // returns all actions metadata
    }
  }
});`,
    exampleResponse: `{
  "success": true,
  "metadata": {
    "actions": [
      {
        "action_type": "move_to_folder",
        "label": "Move to folder",
        "description": "Move email to specified folder",
        "category": "organization",
        "parameters": [
          {
            "name": "folder_name",
            "type": "string",
            "required": true
          }
        ]
      }
    ],
    "categories": ["organization", "status", "labeling", "automation"]
  }
}`
  }
];

// ============================================
// FULL YAML DOCUMENTATION
// ============================================

export const EMAIL_API_YAML_CONTENT = `openapi: 3.0.4
info:
  title: TMWE ERP Email API
  description: |
    Email Management API for TMWE ERP system.

    This API provides comprehensive email management capabilities including:
    - Email account configuration and testing
    - Email synchronization (IMAP/POP3)
    - Email folder management
    - Email message operations (read, send, reply, forward, delete)
    - Email search and filtering

    ## Authentication
    All endpoints require OAuth2 authentication via Bearer token in the Authorization header.
    See the [OAuth2 API documentation](oauth2-api.yaml) for authentication details.

    ## Email Account Configuration
    Before using email features, you must configure an email account with IMAP/SMTP settings.

  version: 1.0.0
  contact:
    name: TMWE API Support
    url: https://findair.it
    email: support@findair.it
  license:
    name: Proprietary

servers:
  - url: https://findair.it/erp/tmwe_json
    description: TMWE ERP Production Server

tags:
  - name: Email Account
    description: Email account configuration and management
  - name: Email Sync
    description: Email synchronization operations
  - name: Email Messages
    description: Email message operations (read, send, search, etc.)
  - name: Email Folders
    description: Email folder management

security:
  - BearerAuth: []

paths:
  # ============================================
  # EMAIL MESSAGES
  # ============================================
  /email_message:
    post:
      tags:
        - Email Messages
      summary: Email message operations
      description: |
        Perform operations on email messages.

        Available handlers:
        - get_messages: Get list of messages with pagination and filtering
        - get_message: Get specific message by ID
        - search_messages: Search messages by criteria
        - send_message: Send new email message
        - reply_message: Reply to existing message
        - forward_message: Forward existing message
        - delete_email: Delete single email permanently
        - move_to_trash: Move single email to trash folder
        - delete_messages: Delete multiple messages permanently
        - move_messages_to_trash: Move multiple messages to trash folder
        - move_messages: Move messages to different folder
        - mark_messages: Mark messages as read/unread/flagged
        - get_attachments: Get attachments for specific message

  # ============================================
  # EMAIL FOLDERS
  # ============================================
  /email_folder:
    post:
      tags:
        - Email Folders
      summary: Email folder management
      description: |
        Manage email folders in the mailbox.

        Available handlers:
        - get_folders: Get list of all folders
        - get_folder_info: Get information about specific folder
        - create_folder: Create new folder
        - delete_folder: Delete folder
        - rename_folder: Rename folder

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: OAuth2
      description: |
        OAuth2 Bearer token authentication.
        Include the access token in the Authorization header as: Bearer {token}

  schemas:
    GetMessagesRequest:
      type: object
      required:
        - handler
      properties:
        handler:
          type: string
          enum: [get_messages]
        folder:
          type: string
          default: INBOX
        page:
          type: integer
          minimum: 1
          default: 1
        limit:
          type: integer
          minimum: 1
          maximum: 200
          default: 50
        sort:
          type: string
          enum: [date, subject, from, size]
          default: date
        order:
          type: string
          enum: [ASC, DESC]
          default: DESC
        include_attachments:
          type: boolean
          default: false
        format:
          type: string
          enum: [text, html]
          default: text

    MessagesListResponse:
      type: object
      properties:
        success:
          type: boolean
        messages:
          type: array
          items:
            type: object
        from:
          type: integer
        to:
          type: integer
        total:
          type: integer
        duration:
          type: number

  responses:
    BadRequest:
      description: Bad request - Invalid parameters
    Unauthorized:
      description: Unauthorized - Invalid or missing authentication token
    NotFound:
      description: Not found - Resource does not exist
    InternalServerError:
      description: Internal server error

# For complete documentation, refer to the full email-api-3.yaml file
`;

export const EMAIL_RULES_YAML_CONTENT = `openapi: 3.0.4
info:
  title: TMWE ERP Email Rules API
  description: |
    **Email Rules Management API for TMWE ERP**

    This API provides comprehensive email rule management capabilities for automating
    email processing and organization in the TMWE ERP system.

    ## Features

    - **Automated Email Processing**: Create rules to automatically process incoming emails
    - **Flexible Conditions**: Define multiple conditions based on email fields (from, subject, body, etc.)
    - **Multiple Actions**: Configure various actions (mark as read, add label, move to folder, etc.)
    - **Rule Prioritization**: Set execution order with priority levels
    - **User Isolation**: Rules are isolated per user and anagrafica
    - **Match Types**: Support for "all" (AND) or "any" (OR) condition matching

    ## Quick Start

    ### 1. Create a Complete Rule (Recommended - Single Request)
    Use /email_rule_bulk for creating complete rules in a single atomic operation.

    ### 2. Get All Rules
    Use /email_rule with show_all=1 parameter

    ### 3. Update a Rule
    POST to /email_rule with item containing id and updated fields

    ### 4. Delete a Rule
    POST to /email_rule with action=delete

    ## Available Field Names

    - from - Email sender address
    - to - Email recipient address
    - cc - CC recipients
    - bcc - BCC recipients
    - subject - Email subject line
    - body - Email body content
    - has_attachment - Whether email has attachments
    - attachment_name - Attachment filename
    - date - Email date
    - size - Email size

    ## Available Operators

    - contains - Field contains value
    - not_contains - Field does not contain value
    - equals - Field equals value exactly
    - not_equals - Field does not equal value
    - starts_with - Field starts with value
    - ends_with - Field ends with value
    - matches_regex - Field matches regular expression
    - is_empty - Field is empty
    - is_not_empty - Field is not empty

    ## Available Action Types

    - mark_as_read - Mark email as read
    - mark_as_unread - Mark email as unread
    - add_label - Add label/tag to email
    - remove_label - Remove label/tag from email
    - move_to_folder - Move email to specified folder
    - copy_to_folder - Copy email to specified folder
    - forward - Forward email to address
    - delete - Delete email permanently
    - mark_as_spam - Mark email as spam
    - mark_as_important - Mark email as important

  version: 1.3.0
  contact:
    name: TMWE API Support
    url: https://findair.it
    email: support@findair.it
  license:
    name: Proprietary

servers:
  - url: https://findair.it/erp/tmwe_json
    description: TMWE ERP Production Server

tags:
  - name: Email Rules
    description: Email rule management (CRUD operations)
  - name: Email Rules Bulk
    description: Create complete email rules with components and actions in one request
  - name: Rule Components
    description: Email rule component/condition management
  - name: Rule Actions
    description: Email rule action management

security:
  - BearerAuth: []

paths:
  /email_rule:
    get:
      tags:
        - Email Rules
      summary: Get email rules
      description: |
        Retrieve email rules for the authenticated user.

        Query Parameters:
        - id: Get specific rule by ID with full details (components and actions)
        - show_all=1: Get all active rules with nested components and actions arrays
        - page & limit: Paginated results
        - search: Search in name and description

    post:
      tags:
        - Email Rules
      summary: Create, update, or delete email rule
      description: |
        Perform CRUD operations on email rules.

        Operations:
        - Create: POST without id in item
        - Update: POST with id in item
        - Delete: POST with action=delete and item id

  /email_rule_bulk:
    post:
      tags:
        - Email Rules Bulk
      summary: Create complete email rule atomically
      description: |
        Create a complete email rule with components and actions in a single atomic operation.
        This is the RECOMMENDED way to create email rules as it ensures all related data
        is created together or fails together.

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: OAuth2

  schemas:
    BulkCreateEmailRuleRequest:
      type: object
      required:
        - item
      properties:
        item:
          type: object
          required:
            - name
            - is_active
            - priority
            - match_type
          properties:
            name:
              type: string
            description:
              type: string
            is_active:
              type: integer
              enum: [0, 1]
            priority:
              type: integer
            match_type:
              type: string
              enum: [all, any]
            components:
              type: array
              items:
                type: object
            actions:
              type: array
              items:
                type: object

# For complete documentation, refer to the full email-rule.yaml file
`;
