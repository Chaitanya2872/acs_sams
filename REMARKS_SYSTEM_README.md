# Structure Remarks System

## Overview

The Structure Remarks System enables Field Engineers (FE) and Verification Engineers (VE) to add, view, and update remarks on structures. This system supports cross-user collaboration where VE can add remarks to structures created by FE and vice versa.

## Key Features

### ✅ Multi-Role Support
- Users can have multiple roles (e.g., both FE and VE)
- Backward compatible with existing single-role system
- Role-based access control for remarks functionality

### ✅ Cross-User Structure Access
- VE can add remarks to structures created by FE
- FE can view and respond to remarks added by VE
- Maintains structure ownership while enabling collaboration

### ✅ Role-Based Remark Categorization
- FE remarks are stored separately from VE remarks
- Each remark includes author information (name, role, timestamp)
- Last updated tracking shows who made the most recent change

### ✅ Complete CRUD Operations
- **Create**: Add new remarks
- **Read**: View all remarks for a structure
- **Update**: Edit existing remarks (users can only edit their own)
- **Delete**: Remove remarks (users can only delete their own)

## Database Schema Changes

### User Schema Updates
```javascript
// Added support for multiple roles
roles: [{
  type: String,
  enum: ['AD', 'TE', 'VE', 'FE'],
  required: true
}],
// Keep primary role for backward compatibility
role: {
  type: String,
  enum: ['AD', 'TE', 'VE', 'FE'],
  required: true,
}
```

### Structure Schema Updates
```javascript
// New remarks system added to structure schema
remarks: {
  fe_remarks: [{
    text: { type: String, required: true, maxlength: 2000 },
    author_name: { type: String, required: true },
    author_role: { type: String, enum: ['FE'], required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  }],
  ve_remarks: [{
    text: { type: String, required: true, maxlength: 2000 },
    author_name: { type: String, required: true },
    author_role: { type: String, enum: ['VE'], required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  }],
  last_updated_by: {
    role: { type: String, enum: ['FE', 'VE'] },
    name: String,
    date: { type: Date, default: Date.now }
  }
}
```

## API Endpoints

### Remarks Management

#### Add Remark
```http
POST /api/structures/:id/remarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Your remark text here"
}
```

#### Get All Remarks
```http
GET /api/structures/:id/remarks
Authorization: Bearer <token>
```

#### Update Remark
```http
PUT /api/structures/:id/remarks/:remarkId
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Updated remark text"
}
```

#### Delete Remark
```http
DELETE /api/structures/:id/remarks/:remarkId
Authorization: Bearer <token>
```

### User Role Management

#### Add Role to User
```http
POST /api/users/:id/roles
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "VE"
}
```

#### Remove Role from User
```http
DELETE /api/users/:id/roles/:role
Authorization: Bearer <admin-token>
```

#### Migrate Existing Users
```http
POST /api/users/migrate-roles
Authorization: Bearer <admin-token>
```

## Usage Examples

### 1. Field Engineer adds initial remark
```javascript
// FE user adds remark to structure
const response = await fetch('/api/structures/64f7b1234567890abcdef123/remarks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <fe-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Initial inspection completed. Structure appears stable.'
  })
});
```

### 2. Verification Engineer adds verification remark
```javascript
// VE user adds remark to same structure (cross-user access)
const response = await fetch('/api/structures/64f7b1234567890abcdef123/remarks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <ve-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Verification completed. Minor electrical issues found.'
  })
});
```

### 3. Get all remarks for a structure
```javascript
const response = await fetch('/api/structures/64f7b1234567890abcdef123/remarks', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

const data = await response.json();
console.log('FE Remarks:', data.data.fe_remarks);
console.log('VE Remarks:', data.data.ve_remarks);
```

## Response Format

### Get Remarks Response
```json
{
  "success": true,
  "message": "Remarks retrieved successfully",
  "data": {
    "structure_id": "64f7b1234567890abcdef123",
    "fe_remarks": [
      {
        "_id": "64f7b1234567890abcdef124",
        "text": "Initial inspection completed. Structure appears stable.",
        "author_name": "John Doe",
        "author_role": "FE",
        "created_at": "2023-09-06T10:30:00.000Z",
        "updated_at": "2023-09-06T10:30:00.000Z"
      }
    ],
    "ve_remarks": [
      {
        "_id": "64f7b1234567890abcdef125",
        "text": "Verification completed. Minor electrical issues found.",
        "author_name": "Jane Smith",
        "author_role": "VE",
        "created_at": "2023-09-06T14:15:00.000Z",
        "updated_at": "2023-09-06T14:15:00.000Z"
      }
    ],
    "total_fe_remarks": 1,
    "total_ve_remarks": 1,
    "last_updated_by": {
      "role": "VE",
      "name": "Jane Smith",
      "date": "2023-09-06T14:15:00.000Z"
    },
    "user_role": "VE",
    "can_add_remarks": true,
    "can_edit_own_remarks": true
  }
}
```

## Migration Guide

### 1. Run User Role Migration
```bash
# Using the API endpoint
curl -X POST http://localhost:3000/api/users/migrate-roles \
  -H "Authorization: Bearer <admin-token>"

# Or run the test script
node test_remarks_system.js
```

### 2. Add Multiple Roles to Users
```bash
# Add VE role to an FE user
curl -X POST http://localhost:3000/api/users/64f7b1234567890abcdef123/roles \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "VE"}'
```

## Security & Permissions

### Role-Based Access Control
- Only FE and VE users can access remarks functionality
- Users can only edit/delete their own remarks
- All users with FE/VE roles can view all remarks
- Admin users can manage user roles

### Cross-User Structure Access
- Structures can be accessed across users for remarks functionality
- Original structure ownership is maintained
- Audit trail tracks all remark changes

## Error Handling

### Common Error Responses
```json
// Insufficient permissions
{
  "success": false,
  "message": "Only Field Engineers (FE) and Verification Engineers (VE) can add remarks",
  "statusCode": 403
}

// Structure not found
{
  "success": false,
  "message": "Structure not found",
  "statusCode": 404
}

// Invalid remark text
{
  "success": false,
  "message": "Remark text is required",
  "statusCode": 400
}
```

## Testing

Run the comprehensive test script:
```bash
node test_remarks_system.js
```

This will:
1. Migrate existing users to support multiple roles
2. Create test FE and VE users
3. Create a test structure
4. Add remarks from both FE and VE users
5. Demonstrate cross-user access
6. Test multiple role functionality

## Integration with Structure Details

The structure details endpoint (`GET /api/structures/:id`) now includes remarks information:

```json
{
  "structure_id": "...",
  "remarks": {
    "fe_remarks": [...],
    "ve_remarks": [...],
    "total_fe_remarks": 1,
    "total_ve_remarks": 1,
    "last_updated_by": {...},
    "user_permissions": {
      "can_view_remarks": true,
      "can_add_remarks": true,
      "can_edit_own_remarks": true,
      "user_role": "FE"
    }
  }
}
```

## Future Enhancements

- [ ] Email notifications when remarks are added
- [ ] Remark status (draft, final, resolved)
- [ ] File attachments to remarks
- [ ] Remark templates for common issues
- [ ] Advanced filtering and search
- [ ] Remark approval workflow
- [ ] Integration with mobile app

## Support

For questions or issues with the remarks system, please contact the development team or create an issue in the project repository.