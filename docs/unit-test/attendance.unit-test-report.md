## Unit test report: `AttendanceService` (`src/services/attendance.service.js`)

### Scope
- **Service under test**: `AttendanceService`
- **Test file**: `src/services/__tests__/attendance.service.test.js`
- **Test style**: Jest unit tests, all external dependencies mocked (repositories, python/ArcFace, IP service, request context, vector similarity).

### What is covered
- **`getTodayContext(userId)`**
  - Input validation (invalid `userId`)
  - Missing employee
  - Blocked status calculation + auto-reset when expired
  - Shift mapping + `currentShift` selection
  - Work minutes calculation with break subtraction
  - Recent records mapping (device parsing)
- **`_validateSecurityChecks(location, securityConfig)`**
  - IP allowlist/deny (requireIpCheck)
  - VPN block
  - GPS location out-of-range
- **`_validateFace(employeeId, files, faceConfig)`**
  - No enrolled face data
  - Python extract failure
  - MULTI_FRAME liveness: insufficient frames
  - SINGLE_FRAME spoof detection
  - Face too small (min size gate)
  - Embedding mismatch vs threshold
  - Successful match path
- **`checkIn(employeeId, files, location)`**
  - Input validation (employeeId/files)
  - Employee not found
  - Blocked by securityStatus
  - Happy path: create record + late minutes + reset status
  - Already checked-in
- **`checkOut(employeeId, files, location)`**
  - Not checked in / already checked out
  - Happy path: break subtraction, early leave computation, repository update
  - Overtime minutes calculation
- **Helpers**: `_getCurrentShift`

### How to run

```bash
npm test -- src/services/__tests__/attendance.service.test.js
```

### Notes / Known limitations
- These are **unit tests**: DB, Redis, external services (ArcFace, IP/VPN detection) are mocked.
- Time-dependent logic is tested using **fake timers** (`jest.setSystemTime`) to make calculations deterministic.

