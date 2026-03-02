# Hướng Dẫn Tích Hợp Shift Management Module

## Tổng Quan

Module Shift Management cung cấp các API để quản lý nhóm ca làm việc, ca làm việc và phân ca cho nhân viên hoặc phòng ban.

## Cấu Trúc Thư Mục

```
src/
├── models/
│   ├── shiftGroup.model.js           # Schema nhóm ca
│   ├── workShift.model.js            # Schema ca làm việc
│   └── shiftAssignment.model.js      # Schema phân ca
├── services/
│   ├── shiftGroup.service.js         # Business logic nhóm ca
│   ├── workShift.service.js          # Business logic ca làm việc
│   └── shiftAssignment.service.js    # Business logic phân ca
├── controllers/
│   ├── shiftGroup.controller.js      # Handler request nhóm ca
│   ├── workShift.controller.js       # Handler request ca làm việc
│   └── shiftAssignment.controller.js # Handler request phân ca
├── routes/
│   └── shift.routes.js               # Định nghĩa routes
├── middleware/
│   └── shiftValidation.middleware.js # Validation middleware
├── utils/
│   └── shiftUtils.js                 # Utility functions
└── ...
scripts/
└── migrate_shift_management.sql      # Database migration
```

## Cách Sử Dụng

### 1. Chạy Migration Database

Chạy file migration để tạo các bảng cần thiết:

```bash
mysql -u [username] -p [database_name] < scripts/migrate_shift_management.sql
```

Hoặc sử dụng client MySQL:

```sql
SOURCE scripts/migrate_shift_management.sql;
```

### 2. Tích Hợp Routes vào Express App

Trong file main app (ví dụ: `src/index.js`):

```javascript
const initializeShiftRoutes = require('./routes/shift.routes');
const db = require('./config/database'); // Your database connection

const app = express();

// Tích hợp shift routes
const shiftRoutes = initializeShiftRoutes(db);
app.use('/api', shiftRoutes);
```

### 3. Sử Dụng Middleware Validation

```javascript
const { validateShiftGroupCreate, validateUUID } = require('./middleware/shiftValidation.middleware');

// Áp dụng validation cho routes
app.post('/api/shift-groups', validateShiftGroupCreate, (req, res) => {
  // ...
});

app.get('/api/shift-groups/:id', validateUUID('id'), (req, res) => {
  // ...
});
```

## API Endpoints

### Shift Group Management (Quản Lý Nhóm Ca)

#### Tạo nhóm ca (Create Shift Group)
- **Endpoint**: `POST /api/shift-groups`
- **Body**:
```json
{
  "name": "Nhóm ca hành chính",
  "description": "Nhóm ca làm việc cho phòng hành chính",
  "companyId": "company-uuid"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Shift group created successfully",
  "data": {
    "id": "uuid",
    "name": "Nhóm ca hành chính",
    "description": "...",
    "companyId": "...",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z"
  }
}
```

#### Lấy danh sách nhóm ca (Get All Shift Groups)
- **Endpoint**: `GET /api/shift-groups?companyId=xxx&isActive=true&limit=10&offset=0`
- **Response**: Array of shift groups

#### Lấy chi tiết nhóm ca (Get Shift Group Details)
- **Endpoint**: `GET /api/shift-groups/:id`
- **Response**: Shift group object

#### Lấy chi tiết nhóm ca với danh sách ca
- **Endpoint**: `GET /api/shift-groups/:id/details`
- **Response**: Shift group object với `shifts` array

#### Cập nhật nhóm ca (Edit Shift Group)
- **Endpoint**: `PUT /api/shift-groups/:id`
- **Body**:
```json
{
  "name": "Nhóm ca mới",
  "description": "Mô tả mới",
  "isActive": true
}
```

#### Xóa nhóm ca (Delete Shift Group)
- **Endpoint**: `DELETE /api/shift-groups/:id`
- **Note**: Không thể xóa nếu có work shifts tồn tại

---

### Work Shift Management (Quản Lý Ca Làm Việc)

#### Tạo ca làm việc (Create Working Shift)
- **Endpoint**: `POST /api/work-shifts`
- **Body**:
```json
{
  "name": "Ca sáng",
  "description": "Ca làm việc buổi sáng",
  "shiftGroupId": "group-uuid",
  "startTime": "08:00:00",
  "endTime": "12:00:00",
  "breakDuration": 0
}
```

#### Lấy danh sách ca của một nhóm
- **Endpoint**: `GET /api/shift-groups/:shiftGroupId/work-shifts?isActive=true`

#### Lấy chi tiết ca làm việc
- **Endpoint**: `GET /api/work-shifts/:id`

#### Cập nhật ca làm việc (Edit Working Shift)
- **Endpoint**: `PUT /api/work-shifts/:id`

#### Xóa ca làm việc (Delete Working Shift)
- **Endpoint**: `DELETE /api/work-shifts/:id`
- **Note**: Không thể xóa nếu có assignments tồn tại

---

### Shift Assignment Management (Quản Lý Phân Ca)

#### Phân ca cho nhân viên (Assign Shift to Employee)
- **Endpoint**: `POST /api/shift-assignments/employee`
- **Body**:
```json
{
  "workShiftId": "shift-uuid",
  "employeeId": "employee-uuid",
  "assignDate": "2024-01-15",
  "notes": "Ghi chú phân ca"
}
```

#### Phân ca cho phòng ban (Assign Shift by Department)
- **Endpoint**: `POST /api/shift-assignments/department`
- **Body**:
```json
{
  "workShiftId": "shift-uuid",
  "departmentId": "department-uuid",
  "assignDate": "2024-01-15",
  "notes": "Phân ca cho toàn bộ phòng ban"
}
```

#### Lấy chi tiết phân ca
- **Endpoint**: `GET /api/shift-assignments/:id`

#### Cập nhật phân ca (Update Shift Assignment)
- **Endpoint**: `PUT /api/shift-assignments/:id`
- **Body**:
```json
{
  "status": "ACTIVE|CANCELLED|PENDING",
  "notes": "Ghi chú mới"
}
```

#### Hủy phân ca (Cancel Shift Assignment)
- **Endpoint**: `DELETE /api/shift-assignments/:id`

---

### Shift Schedule Viewing (Xem Lịch Làm Việc)

#### Xem lịch làm của nhân viên (View Employee Shift Schedule)
- **Endpoint**: `GET /api/employees/:employeeId/shift-schedule?status=ACTIVE&fromDate=2024-01-01&toDate=2024-01-31&limit=50&offset=0`
- **Response**: Array of shift assignments với chi tiết ca làm việc

#### Xem lịch làm của phòng ban (View Department Shift Schedule)
- **Endpoint**: `GET /api/departments/:departmentId/shift-schedule?status=ACTIVE`
- **Response**: Array of shift assignments cho toàn bộ phòng ban

---

## Utility Functions

Module cung cấp các hàm tiện ích trong `src/utils/shiftUtils.js`:

### calculateWorkDuration(startTime, endTime, breakDuration)
Tính thời gian làm việc (phút)

```javascript
const { calculateWorkDuration } = require('./utils/shiftUtils');

const duration = calculateWorkDuration('08:00:00', '12:00:00', 0); // = 240 phút
```

### hasTimeConflict(start1, end1, start2, end2)
Kiểm tra xung đột giờ giữa hai ca

```javascript
const { hasTimeConflict } = require('./utils/shiftUtils');

const conflict = hasTimeConflict('08:00', '12:00', '11:00', '14:00'); // = true
```

### groupScheduleByWeek(assignments)
Nhóm lịch làm việc theo tuần

```javascript
const { groupScheduleByWeek } = require('./utils/shiftUtils');

const grouped = groupScheduleByWeek(employeeAssignments);
// Returns: { week_1_2024: { weekNumber, weekStart, weekEnd, assignments } }
```

---

## Database Schema

### shift_groups Table
- `id`: UUID (Primary Key)
- `name`: VARCHAR(255) - Tên nhóm ca
- `description`: VARCHAR(500)
- `company_id`: UUID - Liên kết công ty
- `is_active`: BOOLEAN - Trạng thái
- `created_at`, `updated_at`: TIMESTAMP

### work_shifts Table
- `id`: UUID (Primary Key)
- `name`: VARCHAR(255)
- `shift_group_id`: UUID (Foreign Key)
- `start_time`: TIME
- `end_time`: TIME
- `break_duration`: INT (phút)
- `work_duration`: INT (phút)
- `is_active`: BOOLEAN

### shift_assignments Table
- `id`: UUID (Primary Key)
- `work_shift_id`: UUID (Foreign Key)
- `employee_id`: UUID (Nullable)
- `department_id`: UUID (Nullable)
- `assignment_type`: ENUM('INDIVIDUAL', 'DEPARTMENT')
- `assign_date`: DATE
- `unassign_date`: DATE (Nullable)
- `status`: ENUM('ACTIVE', 'CANCELLED', 'PENDING')

---

## Error Handling

Tất cả các API trả về response format chuẩn:

### Success Response
```json
{
  "success": true,
  "message": "Operation message",
  "data": { /* data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

### HTTP Status Codes
- `200 OK` - Request thành công
- `201 Created` - Resource được tạo thành công
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource không tồn tại
- `500 Internal Server Error` - Server error

---

## Authentication

Module này giả định có authentication middleware đã setup. Thông tin user được lấy từ `req.user.id`.

Đảm bảo áp dụng authentication middleware trước khi sử dụng routes:

```javascript
const app = express();

// Authentication middleware
app.use((req, res, next) => {
  // Validate JWT token hoặc session
  // Set req.user từ token/session
  next();
});

// Sau đó tích hợp shift routes
const shiftRoutes = initializeShiftRoutes(db);
app.use('/api', shiftRoutes);
```

---

## Ví Dụ Sử Dụng Thực Tế

### 1. Tạo nhóm ca và ca làm việc

```javascript
// Tạo nhóm ca
POST /api/shift-groups
Body: {
  "name": "Nhóm ca làm việc 2024",
  "companyId": "company-001"
}

// Tạo ca sáng
POST /api/work-shifts
Body: {
  "name": "Ca sáng",
  "shiftGroupId": "group-uuid-1",
  "startTime": "08:00:00",
  "endTime": "12:00:00"
}

// Tạo ca chiều
POST /api/work-shifts
Body: {
  "name": "Ca chiều",
  "shiftGroupId": "group-uuid-1",
  "startTime": "13:00:00",
  "endTime": "17:00:00"
}
```

### 2. Phân ca cho nhân viên

```javascript
// Phân ca sáng cho nhân viên
POST /api/shift-assignments/employee
Body: {
  "workShiftId": "shift-uuid-sáng",
  "employeeId": "emp-001",
  "assignDate": "2024-01-15"
}
```

### 3. Xem lịch làm của nhân viên

```javascript
GET /api/employees/emp-001/shift-schedule?status=ACTIVE&fromDate=2024-01-01&toDate=2024-01-31

// Response:
[
  {
    "assignment_id": "assign-uuid",
    "employee_id": "emp-001",
    "shift_id": "shift-uuid",
    "shift_name": "Ca sáng",
    "start_time": "08:00:00",
    "end_time": "12:00:00",
    "assign_date": "2024-01-15",
    "status": "ACTIVE"
  }
]
```

---

## Notes & Best Practices

1. **Time Format**: Luôn sử dụng format HH:mm:ss cho thời gian
2. **Unique Constraint**: Một nhân viên không thể được phân cùng một ca trong cùng ngày
3. **Validation**: Sử dụng middleware validation để validate requests
4. **Error Handling**: Luôn check error responses và handle appropriately
5. **Pagination**: Sử dụng limit/offset cho các endpoint list
6. **Soft Delete**: Module hiện tại không thực hiện soft delete, chỉ thực hiện hard delete

---

## Support

Nếu có bất kỳ câu hỏi hoặc vấn đề, vui lòng liên hệ team development.
