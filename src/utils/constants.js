/**
 * Application-wide constants
 */

// API Messages
const MESSAGES = {
  // Success messages
  DATA_RETRIEVED: 'Data retrieved successfully',
  DATA_CREATED: 'Data created successfully',
  DATA_UPDATED: 'Data updated successfully',
  DATA_DELETED: 'Data deleted successfully',
  
  // Authentication messages
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET: 'Password reset successfully',
  EMAIL_VERIFIED: 'Email verified successfully',
  OTP_SENT: 'OTP sent successfully',
  
  // Error messages
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  FORBIDDEN_ACCESS: 'Forbidden access',
  RESOURCE_NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  DUPLICATE_ENTRY: 'Duplicate entry',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  BAD_REQUEST: 'Bad request',
  
  // User messages
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  
  // Structure messages
  STRUCTURE_NOT_FOUND: 'Structure not found',
  STRUCTURE_CREATED: 'Structure created successfully',
  STRUCTURE_UPDATED: 'Structure updated successfully',
  STRUCTURE_DELETED: 'Structure deleted successfully',
  
  // Inspection messages
  INSPECTION_NOT_FOUND: 'Inspection not found',
  INSPECTION_CREATED: 'Inspection created successfully',
  INSPECTION_UPDATED: 'Inspection updated successfully',
  INSPECTION_DELETED: 'Inspection deleted successfully',
  
  // Email messages
  EMAIL_SENT: 'Email sent successfully',
  EMAIL_VERIFICATION_REQUIRED: 'Email verification required',
  INVALID_EMAIL: 'Invalid email address',
  
  // File upload messages
  FILE_UPLOADED: 'File uploaded successfully',
  FILE_TOO_LARGE: 'File size too large',
  INVALID_FILE_TYPE: 'Invalid file type',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  
  // Maintenance
  SYSTEM_MAINTENANCE: 'System is under maintenance'
};

// Pagination constants
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  INSPECTOR: 'inspector',
  VIEWER: 'viewer'
};

// Structure types
const STRUCTURE_TYPES = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  EDUCATIONAL: 'educational',
  HOSPITAL: 'hospital',
  INDUSTRIAL: 'industrial'
};

// Structure statuses
const STRUCTURE_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REQUIRES_INSPECTION: 'requires_inspection',
  MAINTENANCE_NEEDED: 'maintenance_needed'
};

// Floor types
const FLOOR_TYPES = {
  PARKING: 'parking',
  PARKING_WITH_FLATS: 'parking_with_flats',
  FLATS_ONLY: 'flats_only',
  OPEN_AREA: 'open_area',
  COMMERCIAL: 'commercial',
  MIXED_USE: 'mixed_use'
};

// Flat types
const FLAT_TYPES = {
  ONE_BHK: '1bhk',
  TWO_BHK: '2bhk',
  THREE_BHK: '3bhk',
  FOUR_BHK: '4bhk',
  STUDIO: 'studio',
  DUPLEX: 'duplex',
  PENTHOUSE: 'penthouse',
  SHOP: 'shop',
  OFFICE: 'office',
  PARKING_SLOT: 'parking_slot'
};

// Directions
const DIRECTIONS = {
  NORTH: 'north',
  SOUTH: 'south',
  EAST: 'east',
  WEST: 'west',
  NORTH_EAST: 'north_east',
  NORTH_WEST: 'north_west',
  SOUTH_EAST: 'south_east',
  SOUTH_WEST: 'south_west'
};

// Occupancy statuses
const OCCUPANCY_STATUSES = {
  OCCUPIED: 'occupied',
  VACANT: 'vacant',
  UNDER_MAINTENANCE: 'under_maintenance'
};

// Rating values
const RATINGS = {
  EXCELLENT: 5,
  GOOD: 4,
  FAIR: 3,
  POOR: 2,
  CRITICAL: 1
};

// Inspection types
const INSPECTION_TYPES = {
  ROUTINE: 'routine',
  DETAILED: 'detailed',
  EMERGENCY: 'emergency'
};

// Inspection statuses
const INSPECTION_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  REQUIRES_FOLLOWUP: 'requires_followup'
};

// Severity levels
const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Priority levels
const PRIORITY_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

// Health statuses
const HEALTH_STATUSES = {
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  CRITICAL: 'Critical'
};

// File upload constants
const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif'],
  ALLOWED_DOCUMENT_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
  MAX_FILES_PER_UPLOAD: 10
};

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  INSPECTION_REMINDER: 'inspection_reminder',
  MAINTENANCE_ALERT: 'maintenance_alert'
};

// Date formats
const DATE_FORMATS = {
  DATE_ONLY: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm'
};

// API response codes
const RESPONSE_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Validation rules
const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  EMAIL_MAX_LENGTH: 100,
  OTP_LENGTH: 6,
  PHONE_NUMBER_LENGTH: 10
};

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
};

// Rate limiting
const RATE_LIMITS = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5
  },
  OTP: {
    WINDOW_MS: 1 * 60 * 1000, // 1 minute
    MAX_REQUESTS: 2
  },
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  }
};

module.exports = {
  MESSAGES,
  PAGINATION,
  USER_ROLES,
  STRUCTURE_TYPES,
  STRUCTURE_STATUSES,
  FLOOR_TYPES,
  FLAT_TYPES,
  DIRECTIONS,
  OCCUPANCY_STATUSES,
  RATINGS,
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  SEVERITY_LEVELS,
  PRIORITY_LEVELS,
  HEALTH_STATUSES,
  FILE_UPLOAD,
  EMAIL_TEMPLATES,
  DATE_FORMATS,
  RESPONSE_CODES,
  VALIDATION_RULES,
  CACHE_DURATIONS,
  RATE_LIMITS
};