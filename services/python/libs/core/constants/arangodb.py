"""
ArangoDB Constants - Collection names, graph names, and domain enums.

This module provides all ArangoDB-related constants including collection names,
graph names, and domain-specific enumerations used across services.
"""

from enum import Enum


class DepartmentNames(Enum):
    """Department name classifications for organizational structure."""

    LEGAL = "Legal"
    COMPLIANCE_RISK = "Compliance/Risk Management"
    IT_SECURITY = "IT & Security"
    PRODUCT_MANAGEMENT = "Product Management"
    SALES = "Sales"
    ENGINEERING = "Engineering/Technology"
    HR = "Human Resources"
    PROCUREMENT = "Procurement"
    FINANCE = "Finance"
    OPERATIONS = "Operations"
    RND = "Research and Development"
    EXECUTIVE = "Executive Leadership"
    QA = "Quality Assurance"
    DEVOPS = "Devops/Site Reliability Engineering"
    LEGAL_PATENT = "Legal/Patent Management"
    FACILITIES_ADMIN = "Facilities / Administration"
    DATA_ANALYTICS = "Data Analytics / Insights"
    BUSINESS_DEV = "Business Development / Partnerships"
    ESG = "Environmental, Social, and Governance"
    TRAINING = "Training and Enablement"
    MARKETING = "Marketing"
    INVESTOR_RELATIONS = "Investor Relations"
    CUSTOMER_SUCCESS = "Customer Success"
    OTHERS = "Others"


class Connectors(Enum):
    """Connector type identifiers for external integrations."""

    GOOGLE_DRIVE = "DRIVE"
    GOOGLE_MAIL = "GMAIL"
    GOOGLE_CALENDAR = "CALENDAR"

    ONEDRIVE = "ONEDRIVE"
    SHAREPOINT_ONLINE = "SHAREPOINT ONLINE"
    OUTLOOK = "OUTLOOK"
    OUTLOOK_CALENDAR = "OUTLOOK CALENDAR"
    MICROSOFT_TEAMS = "MICROSOFT TEAMS"

    NOTION = "NOTION"
    SLACK = "SLACK"

    KNOWLEDGE_BASE = "KB"

    CONFLUENCE = "CONFLUENCE"
    JIRA = "JIRA"

    DROPBOX = "DROPBOX"
    WEB = "WEB"
    BOOKSTACK = "BOOKSTACK"

    SERVICENOW = "SERVICENOW"

    SAMBA = "SAMBA"

    UNKNOWN = "UNKNOWN"


class AppGroups(Enum):
    """Application group classifications for connector grouping."""

    GOOGLE_WORKSPACE = "Google Workspace"
    NOTION = "Notion"
    ATLASSIAN = "Atlassian"
    MICROSOFT = "Microsoft"
    DROPBOX = "Dropbox"
    SERVICENOW = "Servicenow"
    WEB = "Web"
    BOOKSTACK = "BookStack"
    FILE_SERVERS = "File Servers"
    SLACK = "Slack"


class OriginTypes(Enum):
    """Record origin type classifications."""

    CONNECTOR = "CONNECTOR"
    UPLOAD = "UPLOAD"


class LegacyCollectionNames(Enum):
    """Legacy ArangoDB collection names (deprecated)."""

    KNOWLEDGE_BASE = "knowledgeBase"
    PERMISSIONS_TO_KNOWLEDGE_BASE = "permissionsToKnowledgeBase"
    BELONGS_TO_KNOWLEDGE_BASE = "belongsToKnowledgeBase"
    BELONGS_TO_KB = "belongsToKB"
    PERMISSIONS = "permissions"
    PERMISSIONS_TO_KB = "permissionsToKB"


class LegacyGraphNames(Enum):
    """Legacy ArangoDB graph names (deprecated)."""

    FILE_ACCESS_GRAPH = "fileAccessGraph"


class GraphNames(Enum):
    """ArangoDB graph names."""

    KNOWLEDGE_GRAPH = "knowledgeGraph"


class CollectionNames(Enum):
    """ArangoDB collection names used across services."""

    # Records and Record relations
    RECORDS = "records"
    RECORD_RELATIONS = "recordRelations"
    RECORD_GROUPS = "recordGroups"
    SYNC_POINTS = "syncPoints"
    INHERIT_PERMISSIONS = "inheritPermissions"

    # Knowledge base
    IS_OF_TYPE = "isOfType"
    PERMISSION = "permission"
    PERMISSIONS = "permissions"
    PERMISSIONS_TO_KB = "permissionsToKB"

    # Drive related
    DRIVES = "drives"
    USER_DRIVE_RELATION = "userDriveRelation"

    # Record types
    FILES = "files"
    LINKS = "links"
    MAILS = "mails"
    WEBPAGES = "webpages"
    COMMENTS = "comments"
    TICKETS = "tickets"

    # Users and groups
    PEOPLE = "people"
    USERS = "users"
    GROUPS = "groups"
    ORGS = "organizations"
    ANYONE = "anyone"
    BELONGS_TO = "belongsTo"
    TEAMS = "teams"
    ROLES = "roles"

    # Departments
    DEPARTMENTS = "departments"
    BELONGS_TO_DEPARTMENT = "belongsToDepartment"
    CATEGORIES = "categories"
    BELONGS_TO_CATEGORY = "belongsToCategory"
    LANGUAGES = "languages"
    BELONGS_TO_LANGUAGE = "belongsToLanguage"
    TOPICS = "topics"
    BELONGS_TO_TOPIC = "belongsToTopic"
    SUBCATEGORIES1 = "subcategories1"
    SUBCATEGORIES2 = "subcategories2"
    SUBCATEGORIES3 = "subcategories3"
    INTER_CATEGORY_RELATIONS = "interCategoryRelations"

    # Other
    CHANNEL_HISTORY = "channelHistory"
    PAGE_TOKENS = "pageTokens"

    APPS = "apps"
    ORG_APP_RELATION = "orgAppRelation"
    USER_APP_RELATION = "userAppRelation"
    ORG_DEPARTMENT_RELATION = "orgDepartmentRelation"

    BLOCKS = "blocks"

    BELONGS_TO_RECORD_GROUP = "belongsToRecordGroup"

    # Storage mappings
    VIRTUAL_RECORD_TO_DOC_ID_MAPPING = "virtualRecordToDocIdMapping"

    # Parent-Child Chunking (Thero-style)
    # Parents are stored here, Children reference via parent_id in Qdrant
    PARENT_CHUNKS = "parentChunks"

    # Agent Builder collections
    AGENT_TEMPLATES = "agentTemplates"
    AGENT_INSTANCES = "agentInstances"


class QdrantCollectionNames(Enum):
    """Qdrant vector database collection names."""

    RECORDS = "records"


class ExtensionTypes(Enum):
    """Supported file extension types."""

    PDF = "pdf"
    DOCX = "docx"
    DOC = "doc"
    PPTX = "pptx"
    PPT = "ppt"
    XLSX = "xlsx"
    XLS = "xls"
    CSV = "csv"
    TXT = "txt"
    MD = "md"
    MDX = "mdx"
    HTML = "html"
    PNG = "png"
    JPG = "jpg"
    JPEG = "jpeg"
    WEBP = "webp"
    SVG = "svg"
    HEIC = "heic"
    HEIF = "heif"


class MimeTypes(Enum):
    """MIME type constants for file type detection."""

    PDF = "application/pdf"
    GMAIL = "text/gmail_content"
    GOOGLE_SLIDES = "application/vnd.google-apps.presentation"
    GOOGLE_DOCS = "application/vnd.google-apps.document"
    GOOGLE_SHEETS = "application/vnd.google-apps.spreadsheet"
    GOOGLE_DRIVE_FOLDER = "application/vnd.google-apps.folder"
    FOLDER = "text/directory"
    DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    DOC = "application/msword"
    PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    PPT = "application/vnd.ms-powerpoint"
    XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    XLS = "application/vnd.ms-excel"
    CSV = "text/csv"
    BIN = "application/octet-stream"
    NOTION_TEXT = "notion/text"
    NOTION_PAGE_COMMENT_TEXT = "notion/pageCommentText"
    HTML = "text/html"
    PLAIN_TEXT = "text/plain"
    MARKDOWN = "text/markdown"
    MDX = "text/mdx"
    GENESIS_32X_ROM = "application/x-genesis-32x-rom"
    JSON = "application/json"
    BLOCKS = "application/blocks"
    XML = "application/xml"
    YAML = "application/yaml"
    UNKNOWN = "application/unknown"
    PNG = "image/png"
    JPG = "image/jpg"
    JPEG = "image/jpeg"
    WEBP = "image/webp"
    SVG = "image/svg+xml"
    HEIC = "image/heic"
    HEIF = "image/heif"
    TEXT = "text/plain"
    ZIP = "application/zip"
    GIF = "image/gif"


class ProgressStatus(Enum):
    """Record processing status values."""

    NOT_STARTED = "NOT_STARTED"
    PAUSED = "PAUSED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    FILE_TYPE_NOT_SUPPORTED = "FILE_TYPE_NOT_SUPPORTED"
    AUTO_INDEX_OFF = "AUTO_INDEX_OFF"


class RecordTypes(Enum):
    """Record type classifications."""

    FILE = "FILE"
    ATTACHMENT = "ATTACHMENT"
    LINK = "LINK"
    MAIL = "MAIL"
    DRIVE = "DRIVE"
    WEBPAGE = "WEBPAGE"
    COMMENT = "COMMENT"
    TICKET = "TICKET"
    MESSAGE = "MESSAGE"
    WEBPAGE_COMMENT = "WEBPAGE_COMMENT"
    NOTION_DATABASE = "NOTION_DATABASE"
    NOTION_PAGE = "NOTION_PAGE"
    SHAREPOINT_LIST = "SHAREPOINT_LIST"
    SHAREPOINT_PAGE = "SHAREPOINT_PAGE"


class RecordRelations(Enum):
    """Record relationship types."""

    PARENT_CHILD = "PARENT_CHILD"
    SIBLING = "SIBLING"
    ATTACHMENT = "ATTACHMENT"


class EventTypes(Enum):
    """Kafka event types for record processing."""

    NEW_RECORD = "newRecord"
    UPDATE_RECORD = "updateRecord"
    DELETE_RECORD = "deleteRecord"
    REINDEX_RECORD = "reindexRecord"
    REINDEX_FAILED = "reindexFailed"
    PERMISSION_UPDATE = "permissionUpdate"  # ACL Push-Down: Sync permissions to vector store


class AccountType(Enum):
    """Organization account type classifications."""

    INDIVIDUAL = "individual"
    ENTERPRISE = "enterprise"
    BUSINESS = "business"
    ADMIN = "admin"


RECORD_TYPE_COLLECTION_MAPPING = {
    "FILE": CollectionNames.FILES.value,
    "MAIL": CollectionNames.MAILS.value,
    "WEBPAGE": CollectionNames.WEBPAGES.value,
    "CONFLUENCE_PAGE": CollectionNames.WEBPAGES.value,
    "CONFLUENCE_BLOGPOST": CollectionNames.WEBPAGES.value,
    "TICKET": CollectionNames.TICKETS.value,
    "COMMENT": CollectionNames.COMMENTS.value,
    "INLINE_COMMENT": CollectionNames.COMMENTS.value,
    "DRIVE": CollectionNames.DRIVES.value,
    # Note: MESSAGE and other types are stored only in records collection
}

