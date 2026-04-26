## Report5.1 style sheet (Attendance)

### Output file
- `docs/unit-test/Report5.1_Attendance_Unit_Test.csv`
- `docs/unit-test/Report5.1_Attendance_Unit_Test.xlsx` (formatted like template)

### How to use in Google Sheets
- Open Google Sheets → **File → Import** → Upload this CSV.
- It will render the same “report header + statistics + UTCID rows” layout as your sample.

### Generate the formatted XLSX (recommended)
From `SkyBreath_SmartHR_BE`:

```bash
node docs/unit-test/generate-report5-attendance-xlsx.js
```

### Notes
- Currently marked **Untested** because it reflects the test design from `src/services/__tests__/attendance.service.test.js`.
- After you run the suite, you can update:
  - **Passed/Failed/Untested counters**
  - Each row’s **Passed/Failed**, **Executed Date**, **Defect ID**

