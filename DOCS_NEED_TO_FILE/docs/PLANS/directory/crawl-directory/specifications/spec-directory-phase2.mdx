# DIRECTORY TOOL - PHASE 1B SPECIFICATION

Contact & Company Management + Distribution Groups

## HUMAN-FRIENDLY OVERVIEW

Phase 1B adds the core company management and contact/user management capabilities to the Directory tool. This phase implements the ability to view and manage companies (vendors) within the project, add and manage contacts (users) within each company, handle their permissions and notifications, and manage distribution groups for mass communication. 

The specification captures all actual Procore behavior including company hierarchies, user permission grids (subset), email and schedule notifications, and distribution group management. This phase transforms the Directory from basic user viewing into a comprehensive contact and vendor management system.

## MASTER CHECKLIST

### API's

- [x] Implement Companies API (GET list, GET detail, POST create, PATCH update)
- [x] Implement Company Users API (GET list, POST add, PATCH edit, DELETE remove)
- [x] Implement User Permissions API (GET, PATCH update grid)
- [x] Implement Email Notifications API (GET, PATCH update preferences)
- [x] Implement Schedule Notifications API (GET, PATCH update preferences)
- [x] Implement Distribution Groups API (GET list, POST create, PATCH update, DELETE remove, PATCH manage members)

### UI

- [x] Implement CompaniesListView component with filtering and pagination
- [x] Implement CompanyDetailView with tabs (General, Users, Bidder Info, Change History)
- [x] Implement AddCompanyModal component
- [x] Implement EditCompanyModal component
- [x] Implement UsersListView component (per company)
- [x] Implement AddUserModal component
- [x] Implement EditUserModal with permissions and notifications
- [x] Implement UserPermissionsGrid component (core permissions subset - 15 modules)
- [x] Implement DistributionGroupsListView component
- [x] Implement AddDistributionGroupModal component
- [x] Implement EditDistributionGroupModal with member management

## Testing

- [x] Write unit tests for all API endpoints
- [x] Write integration tests for company-user relationships
- [x] Write E2E tests for CRUD workflows

## Documentation

- [x] Update database schema with required tables and fields
- [x] Document API errors and handling (400, 403, 404, 500, validation errors)
- [x] Create completion report with test coverage and blockers


## DATABASE SCHEMA

```
Companies Table (vendors)
CREATE TABLE companies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country_state VARCHAR(100),
  zip VARCHAR(20),
  business_phone VARCHAR(20),
  email_address VARCHAR(255),
  primary_contact_id INT,
  project_roles_id INT,
  logo_url VARCHAR(500),
  erp_vendor_id VARCHAR(100) UNIQUE,
  company_type ENUM('YOUR_COMPANY', 'VENDOR', 'SUBCONTRACTOR', 'SUPPLIER'),
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (primary_contact_id) REFERENCES project_users(id),
  INDEX idx_project_id (project_id),
  INDEX idx_status (status)
);
```

Project Users Table (contacts/people)

```
CREATE TABLE project_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  company_id INT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email_address VARCHAR(255) NOT NULL UNIQUE,
  login VARCHAR(255) NOT NULL UNIQUE,
  personal_address TEXT,
  personal_city VARCHAR(100),
  personal_country_state VARCHAR(100),
  personal_zip VARCHAR(20),
  cell_phone VARCHAR(20),
  job_title VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_employee_of_company BOOLEAN DEFAULT false,
  is_insurance_manager BOOLEAN DEFAULT false,
  employee_id VARCHAR(100),
  permission_template_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (permission_template_id) REFERENCES permission_templates(id),
  INDEX idx_project_id (project_id),
  INDEX idx_company_id (company_id),
  INDEX idx_is_active (is_active)
);
```

User Project Roles (join table)

```
CREATE TABLE user_project_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_user_id INT NOT NULL,
  project_role_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_user_id) REFERENCES project_users(id),
  FOREIGN KEY (project_role_id) REFERENCES project_roles(id),
  UNIQUE KEY unique_user_role (project_user_id, project_role_id)
);
```

User Permissions Grid

```
CREATE TABLE user_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_user_id INT NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  permission_level ENUM('none', 'read_only', 'standard', 'admin') DEFAULT 'none',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_user_id) REFERENCES project_users(id),
  UNIQUE KEY unique_user_module (project_user_id, module_name),
  INDEX idx_module_name (module_name)
);
```

Email Notifications Table

```
CREATE TABLE user_email_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_user_id INT NOT NULL,
  emails_default BOOLEAN DEFAULT false,
  rfis_default BOOLEAN DEFAULT false,
  submittals_default BOOLEAN DEFAULT false,
  punchlist_items_default BOOLEAN DEFAULT false,
  weather_delay_email BOOLEAN DEFAULT false,
  weather_delay_phone BOOLEAN DEFAULT false,
  daily_log_default BOOLEAN DEFAULT false,
  delay_log_default BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_user_id) REFERENCES project_users(id),
  UNIQUE KEY unique_user_notifications (project_user_id)
);
```

Schedule Notifications Table

```
CREATE TABLE user_schedule_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_user_id INT NOT NULL,
  all_project_tasks_weekly BOOLEAN DEFAULT false,
  resource_tasks_assigned_to_id INT,
  upon_schedule_changes BOOLEAN DEFAULT false,
  upon_schedule_change_requests BOOLEAN DEFAULT false,
  project_schedule_lookahead_weekly BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_user_id) REFERENCES project_users(id),
  FOREIGN KEY (resource_tasks_assigned_to_id) REFERENCES project_users(id),
  UNIQUE KEY unique_schedule_notifications (project_user_id)
);
```

Distribution Groups Table

```
CREATE TABLE distribution_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  UNIQUE KEY unique_group_name (project_id, name),
  INDEX idx_project_id (project_id)
);
```

Distribution Group Members (join table)

```
CREATE TABLE distribution_group_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  distribution_group_id INT NOT NULL,
  project_user_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (distribution_group_id) REFERENCES distribution_groups(id),
  FOREIGN KEY (project_user_id) REFERENCES project_users(id),
  UNIQUE KEY unique_group_member (distribution_group_id, project_user_id),
  INDEX idx_distribution_group_id (distribution_group_id),
  INDEX idx_project_user_id (project_user_id)
);
```

## API ENDPOINTS

### Companies Endpoints

1. GET /api/projects/{projectId}/companies
List all companies with pagination and filtering.
Request:

```
GET /api/projects/562949954728542/companies?page=1&per_page=25&sort=name&status=ACTIVE
Content-Type: application/json
```

Response (200 OK):

```
json{
  "data": [
    {
      "id": 562949956955785,
      "project_id": 562949954728542,
      "name": "Alleato Group",
      "address": "8383 Craig Street Suite 150",
      "city": "Indianapolis",
      "country_state": "United States - Indiana",
      "zip": "46250",
      "business_phone": "+13177600088",
      "email_address": "bclymer@alleatogroup.com",
      "primary_contact_id": 562949961718060,
      "erp_vendor_id": "ALELLIC",
      "company_type": "YOUR_COMPANY",
      "status": "ACTIVE",
      "user_count": 12,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2026-01-06T08:05:54Z"
    },
    {
      "id": 562949956955786,
      "project_id": 562949954728542,
      "name": "Budget Blinds (Columbus, IN)",
      "address": null,
      "city": null,
      "country_state": null,
      "zip": null,
      "business_phone": "(812) 720-3700",
      "email_address": "amarti@budgetblinds.com",
      "primary_contact_id": 562949961718061,
      "erp_vendor_id": "BUDGBLINDS",
      "company_type": "VENDOR",
      "status": "ACTIVE",
      "user_count": 1,
      "created_at": "2024-02-10T12:15:00Z",
      "updated_at": "2025-12-20T14:45:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 25,
    "total": 25,
    "total_pages": 1
  }
}
```

Error (400 Bad Request):

```
json{
  "error": "invalid_parameter",
  "message": "Invalid per_page value. Must be between 1 and 150.",
  "code": "VALIDATION_ERROR"
}
Error (403 Forbidden):
json{
  "error": "insufficient_permissions",
  "message": "You do not have permission to view companies.",
  "code": "PERMISSION_DENIED"
}
```

---

#### 2. GET /api/projects/{projectId}/companies/{companyId}

Get detailed information for a specific company.

**Request:**

```
GET /api/projects/562949954728542/companies/562949956955785
Content-Type: application/json
Response (200 OK):
json{
  "id": 562949956955785,
  "project_id": 562949954728542,
  "name": "Alleato Group",
  "address": "8383 Craig Street Suite 150",
  "city": "Indianapolis",
  "country_state": "United States - Indiana",
  "zip": "46250",
  "business_phone": "+13177600088",
  "email_address": "bclymer@alleatogroup.com",
  "primary_contact_id": 562949961718060,
  "erp_vendor_id": "ALELLIC",
  "company_type": "YOUR_COMPANY",
  "status": "ACTIVE",
  "logo_url": null,
  "user_count": 12,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2026-01-06T08:05:54Z",
  "users": [
    {
      "id": 562949961718060,
      "first_name": "Brandon",
      "last_name": "Clymer",
      "email_address": "bclymer@alleatogroup.com",
      "job_title": null,
      "is_active": true
    }
  ]
}
```

Error (404 Not Found):

```
json{
  "error": "not_found",
  "message": "Company with ID 562949956955785 not found.",
  "code": "RESOURCE_NOT_FOUND"
}
```


#### 3. POST /api/projects/{projectId}/companies
Create a new company.

**Request:**

```
POST /api/projects/562949954728542/companies
Content-Type: application/json

{
  "name": "New Vendor Company",
  "address": "123 Main Street",
  "city": "Indianapolis",
  "country_state": "United States - Indiana",
  "zip": "46202",
  "business_phone": "(317) 555-1234",
  "email_address": "contact@newvendor.com",
  "erp_vendor_id": "NEWVEND",
  "company_type": "VENDOR"
}
Response (201 Created):
json{
  "id": 562949956955800,
  "project_id": 562949954728542,
  "name": "New Vendor Company",
  "address": "123 Main Street",
  "city": "Indianapolis",
  "country_state": "United States - Indiana",
  "zip": "46202",
  "business_phone": "(317) 555-1234",
  "email_address": "contact@newvendor.com",
  "primary_contact_id": null,
  "erp_vendor_id": "NEWVEND",
  "company_type": "VENDOR",
  "status": "ACTIVE",
  "created_at": "2026-01-06T08:05:54Z",
  "updated_at": "2026-01-06T08:05:54Z"
}
Error (422 Unprocessable Entity):
json{
  "error": "validation_error",
  "message": "Validation failed",
  "errors": {
    "name": ["Name is required"],
    "erp_vendor_id": ["ERP Vendor ID must be unique"]
  },
  "code": "VALIDATION_FAILED"
}
```

---

#### 4. PATCH /api/projects/{projectId}/companies/{companyId}
Update company information.

**Request:**
```
PATCH /api/projects/562949954728542/companies/562949956955785
Content-Type: application/json

{
  "business_phone": "+13177600089",
  "email_address": "newemail@alleatogroup.com",
  "primary_contact_id": 562949961718065
}
Response (200 OK):
json{
  "id": 562949956955785,
  "project_id": 562949954728542,
  "name": "Alleato Group",
  "address": "8383 Craig Street Suite 150",
  "city": "Indianapolis",
  "country_state": "United States - Indiana",
  "zip": "46250",
  "business_phone": "+13177600089",
  "email_address": "newemail@alleatogroup.com",
  "primary_contact_id": 562949961718065,
  "erp_vendor_id": "ALELLIC",
  "company_type": "YOUR_COMPANY",
  "status": "ACTIVE",
  "updated_at": "2026-01-06T08:10:00Z"
}
```

---

### Company Users Endpoints

#### 5. GET /api/projects/{projectId}/companies/{companyId}/users
List all users for a specific company.

**Request:**
```
GET /api/projects/562949954728542/companies/562949956955785/users?page=1&per_page=25
Content-Type: application/json
Response (200 OK):
json{
  "data": [
    {
      "id": 562949961718060,
      "project_id": 562949954728542,
      "company_id": 562949956955785,
      "first_name": "Brandon",
      "last_name": "Clymer",
      "email_address": "bclymer@alleatogroup.com",
      "job_title": null,
      "is_active": true,
      "is_employee_of_company": true,
      "is_insurance_manager": true,
      "employee_id": "EMP001",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2026-01-06T08:05:54Z"
    },
    {
      "id": 562949961718061,
      "project_id": 562949954728542,
      "company_id": 562949956955785,
      "first_name": "Accounting",
      "last_name": "Accounting",
      "email_address": "accounting@alleatogroup.com",
      "job_title": null,
      "is_active": true,
      "is_employee_of_company": true,
      "is_insurance_manager": false,
      "employee_id": null,
      "created_at": "2024-01-20T14:20:00Z",
      "updated_at": "2026-01-06T08:05:54Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 25,
    "total": 2,
    "total_pages": 1
  }
}
```

---

#### 6. POST /api/projects/{projectId}/companies/{companyId}/users
Add a new user to a company.

**Request:**
```
POST /api/projects/562949954728542/companies/562949956955785/users
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email_address": "john.doe@alleatogroup.com",
  "job_title": "Project Manager",
  "is_employee_of_company": true,
  "permission_template_id": 123456
}
Response (201 Created):
json{
  "id": 562949961718070,
  "project_id": 562949954728542,
  "company_id": 562949956955785,
  "first_name": "John",
  "last_name": "Doe",
  "email_address": "john.doe@alleatogroup.com",
  "login": "john.doe@alleatogroup.com",
  "job_title": "Project Manager",
  "is_active": true,
  "is_employee_of_company": true,
  "is_insurance_manager": false,
  "employee_id": null,
  "permission_template_id": 123456,
  "created_at": "2026-01-06T08:15:00Z",
  "updated_at": "2026-01-06T08:15:00Z"
}
```

---

#### 7. GET /api/projects/{projectId}/users/{userId}
Get detailed user information including permissions and notifications.

**Request:**
```
GET /api/projects/562949954728542/users/562949961718060
Content-Type: application/json
Response (200 OK):
json{
  "id": 562949961718060,
  "project_id": 562949954728542,
  "company_id": 562949956955785,
  "first_name": "Brandon",
  "last_name": "Clymer",
  "email_address": "bclymer@alleatogroup.com",
  "login": "bclymer@alleatogroup.com",
  "personal_address": "456 Elm Street",
  "personal_city": "Indianapolis",
  "personal_country_state": "United States - Indiana",
  "personal_zip": "46202",
  "cell_phone": null,
  "job_title": null,
  "is_active": true,
  "is_employee_of_company": true,
  "is_insurance_manager": true,
  "employee_id": "EMP001",
  "permission_template_id": null,
  "project_roles": [
    {
      "id": 1,
      "name": "Project Manager"
    }
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2026-01-06T08:05:54Z"
}
```

---

#### 8. PATCH /api/projects/{projectId}/users/{userId}
Update user information.

**Request:**
```
PATCH /api/projects/562949954728542/users/562949961718060
Content-Type: application/json

{
  "job_title": "Senior Project Manager",
  "is_insurance_manager": true,
  "cell_phone": "(317) 555-9999"
}
Response (200 OK):
json{
  "id": 562949961718060,
  "project_id": 562949954728542,
  "company_id": 562949956955785,
  "first_name": "Brandon",
  "last_name": "Clymer",
  "email_address": "bclymer@alleatogroup.com",
  "job_title": "Senior Project Manager",
  "is_active": true,
  "is_employee_of_company": true,
  "is_insurance_manager": true,
  "cell_phone": "(317) 555-9999",
  "updated_at": "2026-01-06T08:20:00Z"
}
```

---

#### 9. DELETE /api/projects/{projectId}/companies/{companyId}/users/{userId}
Remove a user from a company/project.

**Request:**
```
DELETE /api/projects/562949954728542/companies/562949956955785/users/562949961718070
Content-Type: application/json
```

**Response (204 No Content):**
```
(empty body)
Error (403 Forbidden):
json{
  "error": "cannot_remove_primary_contact",
  "message": "Cannot remove the primary contact of a company.",
  "code": "BUSINESS_RULE_VIOLATION"
}
```

---

### Permissions Endpoints

#### 10. GET /api/projects/{projectId}/users/{userId}/permissions
Get user permissions grid.

**Request:**
```
GET /api/projects/562949954728542/users/562949961718060/permissions
Content-Type: application/json
Response (200 OK):
json{
  "user_id": 562949961718060,
  "permission_template_id": null,
  "permissions": [
    {
      "module_name": "home",
      "permission_level": "admin"
    },
    {
      "module_name": "emails",
      "permission_level": "admin"
    },
    {
      "module_name": "prime_contracts",
      "permission_level": "admin"
    },
    {
      "module_name": "budget",
      "permission_level": "admin"
    },
    {
      "module_name": "commitments",
      "permission_level": "standard"
    },
    {
      "module_name": "change_orders",
      "permission_level": "read_only"
    },
    {
      "module_name": "change_events",
      "permission_level": "read_only"
    },
    {
      "module_name": "direct_costs",
      "permission_level": "none"
    },
    {
      "module_name": "rfis",
      "permission_level": "standard"
    },
    {
      "module_name": "submittals",
      "permission_level": "standard"
    },
    {
      "module_name": "punch_list",
      "permission_level": "standard"
    },
    {
      "module_name": "schedule",
      "permission_level": "read_only"
    },
    {
      "module_name": "photos",
      "permission_level": "standard"
    },
    {
      "module_name": "documents",
      "permission_level": "standard"
    },
    {
      "module_name": "directory",
      "permission_level": "standard"
    }
  ]
}
```

**Note:** Phase 1B includes a core subset of 15 permissions modules. Phase 2 will extend this to include all 25+ modules. The core subset covers the primary workflows.

---

#### 11. PATCH /api/projects/{projectId}/users/{userId}/permissions
Update user permissions.

**Request:**
```
PATCH /api/projects/562949954728542/users/562949961718060/permissions
Content-Type: application/json

{
  "permissions": [
    {
      "module_name": "budget",
      "permission_level": "read_only"
    },
    {
      "module_name": "commitments",
      "permission_level": "admin"
    }
  ]
}
Response (200 OK):
json{
  "user_id": 562949961718060,
  "updated_permissions": [
    {
      "module_name": "budget",
      "permission_level": "read_only"
    },
    {
      "module_name": "commitments",
      "permission_level": "admin"
    }
  ],
  "updated_at": "2026-01-06T08:25:00Z"
}
```

---

### Notifications Endpoints

#### 12. GET /api/projects/{projectId}/users/{userId}/email-notifications
Get email notification preferences.

**Request:**
```
GET /api/projects/562949954728542/users/562949961718060/email-notifications
Content-Type: application/json
Response (200 OK):
json{
  "user_id": 562949961718060,
  "preferences": {
    "emails_default": false,
    "rfis_default": true,
    "submittals_default": true,
    "punchlist_items_default": false,
    "weather_delay_email": true,
    "weather_delay_phone": false,
    "daily_log_default": false,
    "delay_log_default": false
  },
  "updated_at": "2025-11-15T14:30:00Z"
}
```

---

#### 13. PATCH /api/projects/{projectId}/users/{userId}/email-notifications
Update email notification preferences.

**Request:**
```
PATCH /api/projects/562949954728542/users/562949961718060/email-notifications
Content-Type: application/json

{
  "preferences": {
    "emails_default": true,
    "rfis_default": true,
    "submittals_default": false,
    "punchlist_items_default": true
  }
}
Response (200 OK):
json{
  "user_id": 562949961718060,
  "preferences": {
    "emails_default": true,
    "rfis_default": true,
    "submittals_default": false,
    "punchlist_items_default": true,
    "weather_delay_email": true,
    "weather_delay_phone": false,
    "daily_log_default": false,
    "delay_log_default": false
  },
  "updated_at": "2026-01-06T08:30:00Z"
}
```

---

#### 14. GET /api/projects/{projectId}/users/{userId}/schedule-notifications
Get schedule notification preferences.

**Request:**
```
GET /api/projects/562949954728542/users/562949961718060/schedule-notifications
Content-Type: application/json
Response (200 OK):
json{
  "user_id": 562949961718060,
  "preferences": {
    "all_project_tasks_weekly": false,
    "resource_tasks_assigned_to_id": null,
    "upon_schedule_changes": true,
    "upon_schedule_change_requests": false,
    "project_schedule_lookahead_weekly": true
  },
  "updated_at": "2025-10-20T09:15:00Z"
}
```

---

#### 15. PATCH /api/projects/{projectId}/users/{userId}/schedule-notifications
Update schedule notification preferences.

**Request:**
```
PATCH /api/projects/562949954728542/users/562949961718060/schedule-notifications
Content-Type: application/json

{
  "preferences": {
    "all_project_tasks_weekly": true,
    "upon_schedule_changes": true,
    "project_schedule_lookahead_weekly": true
  }
}
Response (200 OK):
json{
  "user_id": 562949961718060,
  "preferences": {
    "all_project_tasks_weekly": true,
    "resource_tasks_assigned_to_id": null,
    "upon_schedule_changes": true,
    "upon_schedule_change_requests": false,
    "project_schedule_lookahead_weekly": true
  },
  "updated_at": "2026-01-06T08:35:00Z"
}
```

---

### Distribution Groups Endpoints

#### 16. GET /api/projects/{projectId}/distribution-groups
List all distribution groups.

**Request:**
```
GET /api/projects/562949954728542/distribution-groups?page=1&per_page=25&sort=name
Content-Type: application/json
Response (200 OK):
json{
  "data": [
    {
      "id": 123456,
      "project_id": 562949954728542,
      "name": "Project Managers",
      "description": "All project managers on the team",
      "member_count": 3,
      "created_at": "2024-02-15T10:00:00Z",
      "updated_at": "2026-01-06T08:05:54Z"
    },
    {
      "id": 123457,
      "project_id": 562949954728542,
      "name": "Safety Coordinators",
      "description": null,
      "member_count": 2,
      "created_at": "2024-03-01T14:30:00Z",
      "updated_at": "2025-12-10T11:20:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 25,
    "total": 2,
    "total_pages": 1
  }
}
```

---

#### 17. POST /api/projects/{projectId}/distribution-groups
Create a new distribution group.

**Request:**
```
POST /api/projects/562949954728542/distribution-groups
Content-Type: application/json

{
  "name": "Electrical Contractors",
  "description": "All electrical contractors and their teams"
}
Response (201 Created):
json{
  "id": 123458,
  "project_id": 562949954728542,
  "name": "Electrical Contractors",
  "description": "All electrical contractors and their teams",
  "member_count": 0,
  "created_at": "2026-01-06T08:40:00Z",
  "updated_at": "2026-01-06T08:40:00Z"
}
Error (422 Unprocessable Entity):
json{
  "error": "validation_error",
  "message": "Validation failed",
  "errors": {
    "name": ["Name is required", "Name must be unique within project"]
  },
  "code": "VALIDATION_FAILED"
}
```

---

#### 18. GET /api/projects/{projectId}/distribution-groups/{groupId}
Get distribution group details with members.

**Request:**
```
GET /api/projects/562949954728542/distribution-groups/123456
Content-Type: application/json
Response (200 OK):
json{
  "id": 123456,
  "project_id": 562949954728542,
  "name": "Project Managers",
  "description": "All project managers on the team",
  "member_count": 3,
  "members": [
    {
      "id": 562949961718060,
      "first_name": "Brandon",
      "last_name": "Clymer",
      "email_address": "bclymer@alleatogroup.com",
      "company_id": 562949956955785,
      "company_name": "Alleato Group",
      "added_at": "2024-02-15T10:05:00Z"
    },
    {
      "id": 562949961718065,
      "first_name": "John",
      "last_name": "Smith",
      "email_address": "jsmith@centralindiana.com",
      "company_id": 562949956955790,
      "company_name": "Central Indiana Hardware",
      "added_at": "2024-02-20T15:30:00Z"
    },
    {
      "id": 562949961718070,
      "first_name": "Sarah",
      "last_name": "Johnson",
      "email_address": "sjohnson@budgetblinds.com",
      "company_id": 562949956955786,
      "company_name": "Budget Blinds",
      "added_at": "2024-03-01T09:00:00Z"
    }
  ],
  "created_at": "2024-02-15T10:00:00Z",
  "updated_at": "2026-01-06T08:05:54Z"
}
```

---

#### 19. PATCH /api/projects/{projectId}/distribution-groups/{groupId}
Update distribution group.

**Request:**
```
PATCH /api/projects/562949954728542/distribution-groups/123456
Content-Type: application/json

{
  "name": "Project Managers & Coordinators",
  "description": "All project managers and coordinators"
}
Response (200 OK):
json{
  "id": 123456,
  "project_id": 562949954728542,
  "name": "Project Managers & Coordinators",
  "description": "All project managers and coordinators",
  "member_count": 3,
  "updated_at": "2026-01-06T08:45:00Z"
}
```

---

#### 20. PATCH /api/projects/{projectId}/distribution-groups/{groupId}/members
Add/remove members from distribution group.

**Request:**
```
PATCH /api/projects/562949954728542/distribution-groups/123456/members
Content-Type: application/json

{
  "add_user_ids": [562949961718080, 562949961718085],
  "remove_user_ids": [562949961718070]
}
Response (200 OK):
json{
  "id": 123456,
  "project_id": 562949954728542,
  "name": "Project Managers & Coordinators",
  "member_count": 4,
  "added_members": [
    {
      "id": 562949961718080,
      "first_name": "Michael",
      "last_name": "Davis",
      "email_address": "mdavis@contractor.com"
    },
    {
      "id": 562949961718085,
      "first_name": "Lisa",
      "last_name": "Martinez",
      "email_address": "lmartinez@contractor.com"
    }
  ],
  "removed_members": [
    {
      "id": 562949961718070,
      "first_name": "Sarah",
      "last_name": "Johnson",
      "email_address": "sjohnson@budgetblinds.com"
    }
  ],
  "updated_at": "2026-01-06T08:50:00Z"
}
```

---

#### 21. DELETE /api/projects/{projectId}/distribution-groups/{groupId}
Delete a distribution group.

**Request:**
```
DELETE /api/projects/562949954728542/distribution-groups/123458
Content-Type: application/json
```

**Response (204 No Content):**
```
(empty body)

ERROR HANDLING
All errors follow a consistent format:
400 Bad Request - Invalid input parameters
json{
  "error": "invalid_request",
  "message": "Description of what went wrong",
  "code": "VALIDATION_ERROR",
  "details": {}
}
403 Forbidden - User lacks permission
json{
  "error": "insufficient_permissions",
  "message": "You do not have permission to perform this action",
  "code": "PERMISSION_DENIED"
}
404 Not Found - Resource doesn't exist
json{
  "error": "not_found",
  "message": "Company with ID 999 not found",
  "code": "RESOURCE_NOT_FOUND"
}
422 Unprocessable Entity - Validation failure
json{
  "error": "validation_error",
  "message": "Validation failed",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  },
  "code": "VALIDATION_FAILED"
}
500 Internal Server Error - Server error
json{
  "error": "server_error",
  "message": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "request_id": "req_abc123xyz"
}
```

## UI COMPONENTS

1. CompaniesListView Component

Location: /src/components/directory/CompaniesListView.tsx
Props: projectId, onCompanySelect, onAddCompany, onEditCompany
Features:

Paginated table with columns: Name, Email/Phone, Status, User Count, Actions
Company status badges (YOUR_COMPANY, VENDOR, CONNECTED_COMPANY)
Search by company name
Filter by status (Active/Inactive)
Sort by name
Edit button per row
View button per row linking to CompanyDetailView
"Add Company" button



2. CompanyDetailView Component

Location: /src/components/directory/CompanyDetailView.tsx
Props: projectId, companyId, onBackClick
Features:

Tabbed interface with tabs: General, Users, Bidder Info, Change History
General Tab:

Display company information (read-only or editable based on permissions)
Fields: Name, Address, City, Country/State, ZIP, Business Phone, Email, Primary Contact, Logo
Edit button to switch to edit mode
Save/Cancel buttons when editing

#### Users Tab:

Embedded UsersListView component
"Add User" button

#### Bidder Info Tab:

TODO: Add bidder information display (Phase 2)

#### Change History Tab:

TODO: Add change history log (Phase 1C)


Back button to return to CompaniesListView

### 3. AddCompanyModal Component

Location: /src/components/directory/modals/AddCompanyModal.tsx
Props: projectId, isOpen, onClose, onSuccess
Features:

Form fields: Name (required), Address, City, Country/State, ZIP, Business Phone, Email, ERP Vendor ID
Form validation with error messages
Submit button to create company
Cancel button
Loading state during submission
Success notification on creation

4. EditCompanyModal Component

Location: /src/components/directory/modals/EditCompanyModal.tsx
Props: projectId, company, isOpen, onClose, onSuccess
Features:

Pre-populated form with existing company data
Same fields as AddCompanyModal
Edit/save workflow
Cancel changes option
Validation before submission
Success notification on update



5. UsersListView Component

Location: /src/components/directory/UsersListView.tsx
Props: projectId, companyId, onUserSelect, onAddUser, onEditUser, showInactive (optional)
Features:

Paginated table with columns: First Name, Last Name, Email, Job Title, Active Status, Actions
Two sections:

"People within [Company] who are on [Project]" - active project members
"People within [Company] who are not on [Project]" - expandable section


Search by name or email
Filter by active/inactive
Edit button per row linking to EditUserModal
Delete/Remove button with confirmation
"Add User" button



6. AddUserModal Component

Location: /src/components/directory/modals/AddUserModal.tsx
Props: projectId, companyId, isOpen, onClose, onSuccess
Features:

Form fields (required: First Name, Last Name, Email)
Optional fields: Job Title, Cell Phone, Employee ID
Checkboxes: Is Employee Of Company, Is Insurance Manager
Permission Template dropdown
Form validation
Submit/Cancel buttons
Advanced section to search and invite existing users by company name



7. EditUserModal Component

Location: /src/components/directory/modals/EditUserModal.tsx
Props: projectId, userId, isOpen, onClose, onSuccess
Features:

Multiple tabs: Personal Info, Company Info, Permissions, Email Notifications, Schedule Notifications
Personal Info Tab:

Fields: First Name, Last Name, Email, Login (read-only), Address, City, Country/State, ZIP, Cell Phone, Job Title
Is Active checkbox
Is Employee Of Company checkbox
Employee ID field


Company Info Tab:

Company Name dropdown (read-only after initial assignment)
Company Address, City, Country/State, ZIP, Business Phone (auto-populated, read-only)


Permissions Tab:

UserPermissionsGrid component


Email Notifications Tab:

Email notification checkboxes


Schedule Notifications Tab:

Schedule notification checkboxes and dropdowns


Save/Cancel buttons



8. UserPermissionsGrid Component

Location: /src/components/directory/permissions/UserPermissionsGrid.tsx
Props: projectId, userId, permissions, onPermissionChange, readOnly (optional)
Features:

Table showing modules with permission levels (None, Read Only, Standard, Admin)
Core 15 modules displayed in Phase 1B:

Home, Emails, Prime Contracts, Budget, Commitments, Change Orders, Change Events, Direct Costs, RFIs, Submittals, Punch List, Schedule, Photos, Documents, Directory


Radio buttons or dropdown for each module
Note: "Additional permissions available in Phase 2"
Save changes on individual selection
Visual indicators for permission levels



9. DistributionGroupsListView Component

Location: /src/components/directory/DistributionGroupsListView.tsx
Props: projectId, onGroupSelect, onAddGroup, onEditGroup
Features:

Paginated table with columns: Name, Description, Member Count, Actions
Search by group name
Edit button per row
Delete button with confirmation
"Add Distribution Group" button
View button to show members

10. AddDistributionGroupModal Component

Location: /src/components/directory/modals/AddDistributionGroupModal.tsx
Props: projectId, isOpen, onClose, onSuccess
Features:

Form fields: Name (required), Description (optional)
Simple modal with just name field (as per Procore behavior)
Submit/Cancel buttons
Validation

11. EditDistributionGroupModal Component

Location: /src/components/directory/modals/EditDistributionGroupModal.tsx
Props: projectId, groupId, isOpen, onClose, onSuccess
Features:

Two sections:

Group Details Tab: Name, Description fields
Members Tab: List of current members with remove buttons, and add members functionality


Search/filter members by name
Add members using user search/select
Remove members with confirmation
Save changes
Cancel button




TESTING REQUIREMENTS
Unit Tests
Test File: /src/__tests__/api/companies.test.ts

Test GET /companies endpoint with pagination
Test GET /companies/{id} endpoint
Test POST /companies with valid data
Test POST /companies with missing required fields
Test PATCH /companies/{id} with partial updates
Test duplicate ERP Vendor ID validation

Test File: /src/__tests__/api/users.test.ts

Test GET /companies/{id}/users pagination
Test POST /companies/{id}/users with valid data
Test user email uniqueness validation
Test PATCH /users/{id} updates
Test DELETE /companies/{id}/users/{id} (user removal)
Test cannot remove primary contact error

Test File: /src/__tests__/api/permissions.test.ts

Test GET user permissions
Test PATCH permissions with valid levels
Test invalid permission level rejection
Test module_name validation

Test File: /src/__tests__/api/notifications.test.ts

Test GET email notifications
Test PATCH email notifications
Test GET schedule notifications
Test PATCH schedule notifications with dropdown selection

Test File: /src/__tests__/api/distribution-groups.test.ts

Test GET distribution groups list
Test POST create group
Test unique group name per project
Test PATCH update group
Test PATCH manage members
Test DELETE distribution group

Test File: /src/__tests__/components/CompaniesListView.test.tsx

Test rendering company list
Test pagination controls
Test search functionality
Test status filter
Test sort by name
Test edit/view button handlers

Test File: /src/__tests__/components/UsersListView.test.tsx

Test rendering users for company
Test two sections (on project / not on project)
Test user search
Test add user button handler
Test edit user button handler
Test delete user with confirmation

Test File: /src/__tests__/components/UserPermissionsGrid.test.tsx

Test rendering all 15 modules
Test permission level selection
Test radio button state changes
Test onChange handler calls

Test Coverage Target: >80% for Phase 1B
Integration Tests
Test File: /src/__tests__/integration/company-user-workflow.test.ts

Test create company → add user → assign permissions workflow
Test update company → verify user still associated
Test remove user → verify user no longer in company list
Test change company primary contact → verify relationship

Test File: /src/__tests__/integration/distribution-group-workflow.test.ts

Test create distribution group → add members → verify members
Test update group → add/remove members → verify changes
Test delete group → verify group no longer exists

Test File: /src/__tests__/integration/notifications-workflow.test.ts

Test set email notifications → verify settings persisted
Test update schedule notifications → verify settings persisted

End-to-End Tests
Test File: /src/__tests__/e2e/company-management.e2e.ts

Test: User navigates to Companies tab → sees list of companies
Test: User clicks "Add Company" → fills form → creates company
Test: User clicks Edit on company → modifies fields → saves changes
Test: User clicks View on company → sees company detail with users tab

Test File: /src/__tests__/e2e/user-management.e2e.ts

Test: User on company detail → clicks "Add User" → creates new user
Test: User clicks Edit user → modifies permissions → saves changes
Test: User clicks Delete user → confirms deletion → user removed

Test File: /src/__tests__/e2e/distribution-groups.e2e.ts

Test: User navigates to Distribution Groups → sees empty/populated list
Test: User creates distribution group → assigns members → verifies group
Test: User edits group → adds/removes members → verifies changes


## IMPLEMENTATION CHECKLIST
Phase 1B Core Implementation

- [x] Create database tables (companies, project_users, user_permissions, user_email_notifications, user_schedule_notifications, distribution_groups, distribution_group_members)
- [x] Create database migration scripts
- [x] Implement CompaniesListView component
- [x] Implement CompanyDetailView component with tabs
- [x] Implement AddCompanyModal component
- [x] Implement EditCompanyModal component
- [x] Implement UsersListView component with dual sections
- [x] Implement AddUserModal component
- [x] Implement EditUserModal with multi-tab interface
- [x] Implement UserPermissionsGrid component (15 core modules)
- [x] Implement DistributionGroupsListView component
- [x] Implement AddDistributionGroupModal component
- [x] Implement EditDistributionGroupModal with member management
- [x] Implement GET /companies endpoint
- [x] Implement GET /companies/{id} endpoint
- [x] Implement POST /companies endpoint
- [x] Implement PATCH /companies/{id} endpoint
- [x] Implement GET /companies/{id}/users endpoint
- [x] Implement POST /companies/{id}/users endpoint
- [x] Implement GET /users/{id} endpoint
- [x] Implement PATCH /users/{id} endpoint
- [x] Implement DELETE /companies/{id}/users/{id} endpoint
- [x] Implement GET /users/{id}/permissions endpoint
- [x] Implement PATCH /users/{id}/permissions endpoint
- [x] Implement GET /users/{id}/email-notifications endpoint
- [x] Implement PATCH /users/{id}/email-notifications endpoint
- [x] Implement GET /users/{id}/schedule-notifications endpoint
- [x] Implement PATCH /users/{id}/schedule-notifications endpoint
- [x] Implement GET /distribution-groups endpoint
- [x] Implement POST /distribution-groups endpoint
- [x] Implement GET /distribution-groups/{id} endpoint
- [x] Implement PATCH /distribution-groups/{id} endpoint
- [x] Implement PATCH /distribution-groups/{id}/members endpoint
- [x] Implement DELETE /distribution-groups/{id} endpoint
- [x] Implement error handling for all endpoints (400, 403, 404, 422, 500)
- [x] Write unit tests (>80% coverage)
- [x] Write integration tests for workflows
- [x] Write E2E tests for user journeys
- [x] Document all API endpoints in OpenAPI/Swagger
- [x] Add TODO comments in code for Phase 1C features (Bidder Info, Change History)
- [x] Add TODO comments in code for Phase 2 extensions (Additional permissions modules, advanced features)


NOTES FOR CLAUDE CODE
Important Implementation Details

Contacts Tab: The "Contacts" tab in Procore Directory is for reference/external contacts. Phase 1B focuses on project users associated with companies. External contacts can be added in Phase 2 if needed.
Permission Grid - Phase 1B Subset: The complete Procore permission grid has 25+ modules. Phase 1B implements only 15 core modules to avoid scope creep. Add a note in the UI: "Additional permissions available in Phase 2." The 10 additional modules are: Transmittals, Transmittals, Meetings, Daily Log, 360 Reporting, Drawings, Specifications, Tasks, Admin, Connection Manager, Scheduling (BETA), Webhooks API, Agent Builder (BETA).
Bidder Info & Insurance Tabs: These features are visible in the company detail view but are not implemented in Phase 1B. Add TODO comments in CompanyDetailView component to implement these in Phase 2.
Change History Tab: Visible in company detail and user edit views. Add TODO comment to implement full change history tracking in Phase 1C.
Business Rules to Enforce:

Cannot remove a company's primary contact
Cannot delete a company if users are still assigned
Email must be unique per project
ERP Vendor ID must be unique per project
Distribution group name must be unique per project
User can only be in a distribution group once


Data Validation:

All phone numbers should support international format validation
Email addresses must be valid format
Required fields: company name, user first/last name, user email, distribution group name
Country/State dropdowns should be populated from shared reference data


UI Consistency:

Follow Procore's orange button styling for primary actions
Use gray buttons for secondary actions
Use modal dialogs for create/edit operations
Show confirmation dialogs before delete operations
Display success/error notifications for all CRUD operations
Use spinners during async operations


Advanced Features (Mark as TODO for Future Phases):

Bulk import users from CSV (Phase 2)
Export directory to PDF/CSV (Phase 1B Foundation, full implementation Phase 2)
Company logo upload and display (Phase 1B Foundation)
Advanced permission templates management (Phase 2)
Notification digest/scheduling (Phase 2)
User deactivation/reactivation workflows (Phase 2)




ACCEPTANCE CRITERIA
For Each Endpoint

- ✅ Endpoint returns correct HTTP status codes (200, 201, 204, 400, 403, 404, 422, 500)
- ✅ Response matches documented JSON schema exactly
- ✅ Request validation rejects invalid inputs with 422 status
- ✅ Permissions check prevents unauthorized access with 403 status
- ✅ Resource not found returns 404 status
- ✅ Error responses follow consistent format

For Each Component

- ✅ Component renders without errors
- ✅ Props are validated and logged if invalid
- ✅ Event handlers call callbacks with correct parameters
- ✅ Loading states show spinners during async operations
- ✅ Error states display user-friendly messages
- ✅ Form validation prevents submission of invalid data
- ✅ Confirmation dialogs appear before destructive actions
- ✅ Success notifications display after CRUD operations

For Testing

- ✅ All endpoints covered by unit tests
- ✅ All components covered by unit tests
- ✅ Integration tests cover workflows across multiple endpoints
- ✅ E2E tests cover complete user journeys
- ✅ Test coverage >80% for Phase 1B code
- ✅ All tests pass without warnings
- ✅ Mock data matches actual Procore data structure


PHASE 1B DELIVERABLES SUMMARY
Files to Create: 45+

7 API endpoint modules
11 React components
8 test files
1 database schema file
1 migration script

API Endpoints: 21 (GET, POST, PATCH, DELETE operations)
Database Tables: 7 new tables
Components: 11 React components with TypeScript
Test Coverage: >80% unit, integration, and E2E tests
Estimated Implementation Time: 12-16 hours
This completes the Phase 1B specification ready for Claude Code implementation!