
## 1. Nghỉ phép & Đơn nghỉ

### Q1. Tôi còn bao nhiêu ngày phép? / Q106. tui còn bn ngày phép?
Tính số ngày phép năm còn lại của tôi trong năm hiện tại bằng cách trừ số ngày đã dùng từ định mức tối đa.
```sql
SELECT 
    lp.days_per_year AS tong_phep_quy_dinh,
    lb.used_days AS da_dung,
    (lp.days_per_year - lb.used_days) AS phep_con_lai
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
WHERE lb.employee_id = :my_employee_id 
  AND lb.leave_type_id = 1 -- 1 là Annual Leave
  AND lb.year = YEAR(CURDATE());
```

### Q2. Tôi đã nghỉ bao nhiêu ngày? / Q43. Tôi đã nghỉ bao nhiêu ngày năm nay?
Tổng số ngày nghỉ phép các loại đã dùng trong năm nay từ bảng số dư nghỉ phép.
```sql
SELECT SUM(used_days) AS tong_ngay_da_nghi
FROM leave_balances
WHERE employee_id = :my_employee_id 
  AND year = YEAR(CURDATE());
```

### Q3. Tôi đã nghỉ bao nhiêu ngày trong tháng này? / Q31. Tôi đã nghỉ bao nhiêu ngày trong tháng?
Đếm tổng số ngày nghỉ đã được phê duyệt trong tháng hiện tại từ bảng đơn từ `requests`.
```sql
SELECT SUM(quantity) AS so_ngay_nghi_thang_nay
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 1 -- 1 là nhóm LEAVE (Nghỉ phép)
  AND status = 'APPROVED'
  AND MONTH(start_date) = MONTH(CURDATE())
  AND YEAR(start_date) = YEAR(CURDATE());
```


### Q4. Nghỉ hôm nay có hợp lệ không?
Kiểm tra xem hôm nay có bất kỳ đơn nghỉ phép nào của tôi được phê duyệt bao phủ ngày hôm nay không.
```sql
SELECT EXISTS (
    SELECT 1 
    FROM requests 
    WHERE employee_id = :my_employee_id
      AND request_group_id = 1
      AND status = 'APPROVED'
      AND CURDATE() BETWEEN start_date AND end_date
) AS nghi_hom_nay_hop_le;
```

### Q5. Nghỉ 15/04 có được duyệt không?
Kiểm tra trạng thái đơn nghỉ phép bao phủ ngày 15/04 (năm hiện tại).
```sql
SELECT id, request_code, status, quantity, start_date, end_date, description
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 1
  AND '2026-04-15' BETWEEN start_date AND end_date;
```

### Q6. Trạng thái đơn nghỉ mà tôi đang gửi? / Q110. đơn nghỉ của tui duyệt chưa
Tra cứu trạng thái của đơn nghỉ phép gần đây nhất hoặc các đơn đang ở trạng thái chờ duyệt.
```sql
-- Các đơn nghỉ phép đang chờ duyệt:
SELECT id, request_code, status, quantity, start_date, end_date, submitted_at
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 1
  AND status = 'PENDING'
ORDER BY created_at DESC;
```

### Q7. Nghỉ không lương là gì?
Tra cứu chính sách nghỉ không lương (Leave Type = 3) định mức số ngày mỗi năm từ bảng quy định.
```sql
SELECT lt.leave_type_name AS loai_nghi, lp.policy_name AS ten_chinh_sach, lp.days_per_year AS so_ngay_quy_dinh, lt.is_paid AS co_luong
FROM leave_types lt
JOIN leave_policies lp ON lt.id = lp.leave_type_id
WHERE lt.id = 3; -- 3 là Unpaid Leave
```

### Q8. Nghỉ phép năm là gì?
Tra cứu chính sách nghỉ phép năm (Leave Type = 1).
```sql
SELECT lt.leave_type_name AS loai_nghi, lp.policy_name AS ten_chinh_sach, lp.days_per_year AS so_ngay_quy_dinh, lt.is_paid AS co_luong
FROM leave_types lt
JOIN leave_policies lp ON lt.id = lp.leave_type_id
WHERE lt.id = 1; -- 1 là Annual Leave
```

### Q9. Nghỉ lễ 30/4 1-5 bao nhiêu ngày?
Tra cứu chi tiết đợt nghỉ lễ 30/4 - 1/5 trong bảng danh sách ngày lễ.
```sql
SELECT holiday_name, start_date, end_date, 
       DATEDIFF(end_date, start_date) + 1 AS tong_so_ngay_nghi,
       description
FROM holiday_list
WHERE holiday_name LIKE '%30/1- 1/5%' OR holiday_name LIKE '%30/4%' OR holiday_name LIKE '%30/04%';
```

### Q10. Tôi được nghỉ phép tối đa bao ngày trong năm
Định mức ngày phép năm tối đa theo quy định chính sách.
```sql
SELECT days_per_year AS phep_nam_toi_da
FROM leave_policies
WHERE leave_type_id = 1; -- 1 là Annual Leave
```

### Q11. Số ngày nghỉ phép mà tôi đã dùng trong năm
```sql
SELECT used_days AS phep_nam_da_dung
FROM leave_balances
WHERE employee_id = :my_employee_id
  AND leave_type_id = 1
  AND year = YEAR(CURDATE());
```

### Q12. Số ngày nghỉ phép còn lại của tôi trong năm / Q114. còn phép năm ko
```sql
SELECT lp.days_per_year - lb.used_days AS phep_nam_con_lai
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
WHERE lb.employee_id = :my_employee_id
  AND lb.leave_type_id = 1
  AND lb.year = YEAR(CURDATE());
```

### Q13. Nghỉ thai sản như nào?
Tra cứu chính sách nghỉ thai sản (Maternity Leave - ID = 4).
```sql
SELECT lt.leave_type_name AS loai_nghi, lp.policy_name AS ten_chinh_sach, lp.days_per_year AS so_ngay_quy_dinh, lt.is_paid AS co_luong
FROM leave_types lt
JOIN leave_policies lp ON lt.id = lp.leave_type_id
WHERE lt.id = 4; -- 4 là Maternity Leave
```

### Q14. Cho xem các đơn nghỉ phép bị từ chối / Q51. Đơn nghỉ phép bị từ chối của tôi.
```sql
SELECT request_code, quantity AS so_ngay, start_date, end_date, description, rejected_at
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 1 -- 1 là Leave
  AND status = 'REJECTED'
ORDER BY rejected_at DESC;
```

### Q15. Số ngày nghỉ của nhân viên A
Tra cứu tổng ngày nghỉ của một nhân viên tên A (sử dụng LIKE tìm kiếm hoặc mã nhân viên).
```sql
SELECT e.employee_code, e.full_name, SUM(lb.used_days) AS tong_ngay_nghi
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
WHERE (e.full_name LIKE '%Nhân viên A%' OR e.employee_code = :employee_code_A)
  AND lb.year = YEAR(CURDATE())
GROUP BY e.id, e.employee_code, e.full_name;
```

### Q16. Nghỉ của nhân viên B
Tra cứu chi tiết các đơn nghỉ đã duyệt của Nhân viên B.
```sql
SELECT e.employee_code, e.full_name, r.request_code, r.quantity AS so_ngay, r.start_date, r.end_date, r.status
FROM requests r
JOIN employees e ON r.employee_id = e.id
WHERE (e.full_name LIKE '%Nhân viên B%' OR e.employee_code = :employee_code_B)
  AND r.request_group_id = 1
  AND r.status = 'APPROVED'
ORDER BY r.start_date DESC;
```

### Q17. Ngày nghỉ còn lại của nhân viên B trong năm nay
```sql
SELECT e.employee_code, e.full_name, lp.days_per_year - lb.used_days AS phep_con_lai
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
JOIN employees e ON lb.employee_id = e.id
WHERE (e.full_name LIKE '%Nhân viên B%' OR e.employee_code = :employee_code_B)
  AND lb.leave_type_id = 1
  AND lb.year = YEAR(CURDATE());
```

### Q18. Ngày nghỉ còn lại của nhân viên A trong năm nay
```sql
SELECT e.employee_code, e.full_name, lp.days_per_year - lb.used_days AS phep_con_lai
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
JOIN employees e ON lb.employee_id = e.id
WHERE (e.full_name LIKE '%Nhân viên A%' OR e.employee_code = :employee_code_A)
  AND lb.leave_type_id = 1
  AND lb.year = YEAR(CURDATE());
```

### Q19. Ngày nghỉ còn lại của nhân viên A và tôi trong năm nay
```sql
SELECT e.employee_code, e.full_name, lp.days_per_year - lb.used_days AS phep_con_lai
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
JOIN employees e ON lb.employee_id = e.id
WHERE (lb.employee_id = :my_employee_id 
   OR e.full_name LIKE '%Nhân viên A%' 
   OR e.employee_code = :employee_code_A)
  AND lb.leave_type_id = 1
  AND lb.year = YEAR(CURDATE());
```

### Q41. Tôi còn bao nhiêu ngày phép? (Trùng lặp Q1)
```sql
SELECT lp.days_per_year - lb.used_days AS remaining_leave_days
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
WHERE lb.employee_id = :my_employee_id
  AND lb.leave_type_id = 1
  AND lb.year = YEAR(CURDATE());
```

### Q42. Đơn nghỉ phép của tôi đã được duyệt chưa?
```sql
SELECT request_code, quantity AS so_ngay, start_date, end_date, status, approved_at
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 1 -- Leave
ORDER BY created_at DESC
LIMIT 1;
```

### Q44. Lịch sử nghỉ phép của tôi.
```sql
SELECT r.request_code, rt.name AS loai_nghi, r.quantity AS so_ngay, r.start_date, r.end_date, r.status, r.created_at
FROM requests r
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.employee_id = :my_employee_id
  AND r.request_group_id = 1 -- Leave
ORDER BY r.created_at DESC;
```

### Q45. Tôi có đơn nghỉ nào đang chờ duyệt không?
```sql
SELECT id, request_code, quantity AS so_ngay, start_date, end_date, submitted_at, current_approver_id
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 1 -- Leave
  AND status = 'PENDING';
```

### Q46. Ai duyệt đơn nghỉ của tôi?
Xem người quản lý trực tiếp chịu trách nhiệm duyệt hoặc người đang được gán duyệt đơn hiện tại.
```sql
-- Người quản lý trực tiếp duyệt đơn của tôi:
SELECT m.employee_code, m.full_name, m.company_email
FROM employees e
JOIN employees m ON e.direct_manager_id = m.id
WHERE e.id = :my_employee_id;

-- Hoặc người đang xử lý đơn nghỉ phép cụ thể đang chờ duyệt:
SELECT r.request_code, e.full_name AS nguoi_duyet_hien_tai, e.company_email
FROM requests r
JOIN employees e ON r.current_approver_id = e.id
WHERE r.employee_id = :my_employee_id
  AND r.request_group_id = 1
  AND r.status = 'PENDING';
```

### Q48. Tôi nghỉ phép gần nhất vào ngày nào?
```sql
SELECT start_date, end_date, quantity AS so_ngay, status, description
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 1
  AND status = 'APPROVED'
  AND start_date <= CURDATE()
ORDER BY start_date DESC
LIMIT 1;
```

### Q49. Tôi có nghỉ không lương tháng này không?
```sql
SELECT EXISTS (
    SELECT 1 
    FROM requests 
    WHERE employee_id = :my_employee_id
      AND request_type_id = 3 -- 3 là Nghỉ không lương
      AND status = 'APPROVED'
      AND MONTH(start_date) = MONTH(CURDATE())
      AND YEAR(start_date) = YEAR(CURDATE())
) AS co_nghi_khong_luong_thang_nay;
```

### Q50. Tổng số ngày nghỉ của phòng Marketing tháng này.
```sql
SELECT SUM(r.quantity) AS tong_so_ngay_nghi
FROM requests r
JOIN employees e ON r.employee_id = e.id
JOIN departments d ON e.department_id = d.id
WHERE d.department_name = 'Marketing'
  AND r.request_group_id = 1 -- Leave
  AND r.status = 'APPROVED'
  AND MONTH(r.start_date) = MONTH(CURDATE())
  AND YEAR(r.start_date) = YEAR(CURDATE());
```

### Q52. Tôi đã gửi bao nhiêu đơn nghỉ?
Đếm tất cả các đơn nghỉ từ trạng thái nháp (DRAFT) đến đã gửi.
```sql
SELECT COUNT(*) AS tong_so_don_nghi_da_gui
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 1
  AND status != 'DRAFT';
```

### Q54. Tôi còn phép năm của năm trước không?
Kiểm tra số dư phép của năm ngoái (năm hiện tại - 1).
```sql
SELECT lp.days_per_year - lb.used_days AS phep_nam_ngoai_con_lai
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
WHERE lb.employee_id = :my_employee_id
  AND lb.leave_type_id = 1
  AND lb.year = YEAR(CURDATE()) - 1;
```

### Q55. Danh sách nghỉ lễ của công ty.
```sql
SELECT holiday_name, start_date, end_date, holiday_type, description
FROM holiday_list
WHERE is_deleted = 0
ORDER BY start_date;
```

### Q105. Tôi còn phép không?
```sql
SELECT (lp.days_per_year - lb.used_days) > 0 AS con_ngay_phep
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
WHERE lb.employee_id = :my_employee_id
  AND lb.leave_type_id = 1
  AND lb.year = YEAR(CURDATE());
```

### Q118. Tôi còn phép và đã nghỉ bao nhiêu ngày?
```sql
SELECT 
    lp.days_per_year AS tong_dinh_muc,
    lb.used_days AS da_nghi,
    (lp.days_per_year - lb.used_days) AS phep_con_lai
FROM leave_balances lb
JOIN leave_policies lp ON lb.leave_type_id = lp.leave_type_id
WHERE lb.employee_id = :my_employee_id
  AND lb.leave_type_id = 1
  AND lb.year = YEAR(CURDATE());
```

### Q119. Xem đơn nghỉ và trạng thái duyệt.
```sql
SELECT r.request_code, rt.name AS loai_nghi, r.quantity AS so_ngay, r.status, r.approved_at, r.rejected_at
FROM requests r
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.employee_id = :my_employee_id
  AND r.request_group_id = 1 -- Leave
ORDER BY r.created_at DESC;
```

---

## 2. Chấm công & Đi muộn/Về sớm/OT

### Q20. Hôm nay tôi check-in lúc mấy giờ?
```sql
SELECT check_in_time, attendance_status, attendance_type
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = CURDATE();
```

### Q21. Tôi check-out chưa?
```sql
SELECT 
    CASE 
        WHEN check_out_time IS NOT NULL THEN 'Đã check-out'
        ELSE 'Chưa check-out'
    END AS trang_thai,
    check_out_time
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = CURDATE();
```

### Q22. Tổng giờ làm hôm nay là bao nhiêu?
`total_work_minutes` chuyển đổi sang giờ.
```sql
SELECT total_work_minutes / 60.0 AS tong_gio_lam_hom_nay
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = CURDATE();
```

### Q23. Tôi đi trễ bao nhiêu lần tháng này?
Đếm các bản ghi có trạng thái 'late' hoặc có số phút đi muộn trong tháng hiện tại.
```sql
SELECT COUNT(*) AS so_lan_di_tre
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND (attendance_status = 'late' OR late_minutes > 0)
  AND MONTH(work_date) = MONTH(CURDATE())
  AND YEAR(work_date) = YEAR(CURDATE());
```

### Q24. Lịch sử chấm công tuần này của tôi.
```sql
SELECT work_date, check_in_time, check_out_time, attendance_status, late_minutes, early_leave_minutes, total_work_minutes
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND YEARWEEK(work_date, 1) = YEARWEEK(CURDATE(), 1)
ORDER BY work_date;
```

### Q25. Tôi làm bao nhiêu giờ OT tháng này? / Q115. OT tháng này bao nhiêu giờ
Tổng thời gian làm thêm giờ (OT) từ bảng chi tiết chấm công.
```sql
SELECT SUM(overtime_minutes) / 60.0 AS tong_gio_ot_thang_nay
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND MONTH(work_date) = MONTH(CURDATE())
  AND YEAR(work_date) = YEAR(CURDATE());
```

### Q26. Hôm qua tôi làm bao nhiêu tiếng? / Q112. hôm qua tui làm bn tiếng
```sql
SELECT total_work_minutes / 60.0 AS so_gio_lam_hom_qua
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
```

### Q27. Cho tôi xem bảng công tháng này.
Truy vấn bảng công cá nhân từ bảng tổng hợp `time_sheets` hoặc danh sách chi tiết từng ngày chấm công.
```sql
-- Dạng tổng hợp:
SELECT month, year, total_working_days, total_working_hours, overtime_hours, annual_leave_days, unpaid_leave_days
FROM time_sheets
WHERE employee_id = :my_employee_id
  AND month = MONTH(CURDATE())
  AND year = YEAR(CURDATE());

-- Dạng chi tiết từng ngày:
SELECT work_date, check_in_time, check_out_time, attendance_status, total_work_minutes / 60.0 AS so_gio_lam
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND MONTH(work_date) = MONTH(CURDATE())
  AND YEAR(work_date) = YEAR(CURDATE())
ORDER BY work_date;
```

### Q28. Ngày nào tôi quên chấm công?
Tìm các ngày mà quên Check-in hoặc Check-out (giá trị NULL) trên hệ thống chấm công hoặc tìm đơn đề xuất 'Quên chấm công'.
```sql
-- Tra cứu từ nhật ký chấm công:
SELECT work_date, check_in_time, check_out_time, attendance_status
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND (check_in_time IS NULL OR check_out_time IS NULL)
  AND attendance_status != 'absent'
  AND MONTH(work_date) = MONTH(CURDATE())
  AND YEAR(work_date) = YEAR(CURDATE());

-- Hoặc các đề xuất quên chấm công đã gửi:
SELECT request_code, start_date AS ngay_quen, description, status
FROM requests
WHERE employee_id = :my_employee_id
  AND request_type_id = 6 -- 6 là loại 'Quên chấm công'
ORDER BY start_date DESC;
```

### Q29. Tôi có đi làm hôm 20/04 không?
```sql
SELECT work_date, check_in_time, check_out_time, attendance_status
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = '2026-04-20';
```

### Q30. Tổng số ngày công tháng này là bao nhiêu?
```sql
-- Lấy từ bảng công tổng hợp:
SELECT total_working_days AS so_ngay_cong_chinh_thuc
FROM time_sheets
WHERE employee_id = :my_employee_id
  AND month = MONTH(CURDATE())
  AND year = YEAR(CURDATE());

-- Hoặc đếm các ngày chấm công thực tế:
SELECT COUNT(*) AS so_ngay_di_lam
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND attendance_status IN ('present', 'late', 'early_leave')
  AND MONTH(work_date) = MONTH(CURDATE())
  AND YEAR(work_date) = YEAR(CURDATE());
```

### Q36. Tôi check-in bằng thiết bị nào?
Tra cứu phương thức check-in (face, gps, qr, manual) hôm nay.
```sql
SELECT work_date, check_in_time, attendance_type AS thiet_bi_phuong_thuc
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = CURDATE();
```

### Q37. Tôi check-in bằng thiết bị nào vào ngày hôm qua?
```sql
SELECT work_date, check_in_time, attendance_type AS thiet_bi_phuong_thuc
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
```

### Q38. Thời gian làm việc trung bình của tôi là bao nhiêu trong tháng trước?
```sql
SELECT AVG(total_work_minutes) / 60.0 AS trung_binh_gio_lam_moi_ngay
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND MONTH(work_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
  AND YEAR(work_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
  AND total_work_minutes IS NOT NULL;
```

### Q39. Tôi có bị thiếu công không?
Tìm những ngày trong tháng này mà có trạng thái vắng mặt (absent) hoặc thời gian làm việc nhỏ hơn ca chuẩn (8 tiếng = 480 phút).
```sql
SELECT work_date, attendance_status, total_work_minutes / 60.0 AS so_gio_lam
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND MONTH(work_date) = MONTH(CURDATE())
  AND YEAR(work_date) = YEAR(CURDATE())
  AND (attendance_status = 'absent' OR total_work_minutes < 480);
```

### Q40. Lịch sử OT của tôi trong 3 tháng gần nhất.
```sql
SELECT work_date, overtime_minutes / 60.0 AS so_gio_ot, attendance_status
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND overtime_minutes > 0
  AND work_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
ORDER BY work_date DESC;
```

### Q102. Hôm qua tôi check-in lúc nào?
```sql
SELECT check_in_time
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
```

### Q108. checkin hôm nay sao rồi?
```sql
SELECT work_date, check_in_time, check_out_time, attendance_status, late_minutes
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND work_date = CURDATE();
```

### Q109. cho xem bảng công t3 (Tháng 3)
```sql
-- Dạng tổng hợp:
SELECT month, year, total_working_days, total_working_hours, overtime_hours
FROM time_sheets
WHERE employee_id = :my_employee_id
  AND month = 3
  AND year = YEAR(CURDATE());

-- Chi tiết theo ngày:
SELECT work_date, check_in_time, check_out_time, attendance_status, total_work_minutes / 60.0 AS so_gio_lam
FROM attendance_records
WHERE employee_id = :my_employee_id
  AND MONTH(work_date) = 3
  AND YEAR(work_date) = YEAR(CURDATE())
ORDER BY work_date;
```

### Q117. Cho tôi xem công và OT tháng này.
```sql
SELECT month, year, total_working_days, total_working_hours, overtime_hours
FROM time_sheets
WHERE employee_id = :my_employee_id
  AND month = MONTH(CURDATE())
  AND year = YEAR(CURDATE());
```

---

## 3. Chỉ số quản trị, Đi trễ, Hôm nay

### Q32. Hôm nay ai chưa check-in? / Q127. Ai chưa check-in?
Truy vấn danh sách nhân viên đang hoạt động nhưng chưa có bản ghi check-in hoặc chưa check-in hôm nay.
```sql
SELECT e.employee_code, e.full_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN attendance_records ar ON e.id = ar.employee_id AND ar.work_date = CURDATE()
WHERE e.is_deleted = 0 
  AND e.employment_status = 'ACTIVE'
  AND (ar.check_in_time IS NULL OR ar.id IS NULL);
```

### Q33. Danh sách nhân viên đi trễ hôm nay. / Q126. Danh sách nhân viên đi trễ hôm nay.
```sql
SELECT e.employee_code, e.full_name, ar.check_in_time, ar.late_minutes
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE ar.work_date = CURDATE()
  AND (ar.attendance_status = 'late' OR ar.late_minutes > 0);
```

### Q34. Phòng IT có bao nhiêu người đang làm việc hôm nay?
Số lượng nhân viên phòng IT có check-in hôm nay và chưa check-out.
```sql
SELECT COUNT(DISTINCT ar.employee_id) AS so_nv_it_dang_lam_viec
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
JOIN departments d ON e.department_id = d.id
WHERE ar.work_date = CURDATE()
  AND ar.check_in_time IS NOT NULL
  AND ar.check_out_time IS NULL
  AND (d.department_name LIKE '%IT%' OR d.department_name LIKE '%Software Development%');
```

### Q35. Ai đang OT hôm nay?
```sql
-- Dựa trên đơn làm thêm giờ đã được duyệt hôm nay:
SELECT e.employee_code, e.full_name, r.quantity AS so_gio_dang_ky, r.description
FROM requests r
JOIN employees e ON r.employee_id = e.id
WHERE r.request_group_id = 2 -- 2 là nhóm OVERTIME
  AND r.status = 'APPROVED'
  AND CURDATE() BETWEEN r.start_date AND r.end_date;
```

### Q128. Tổng OT phòng IT tháng này.
```sql
SELECT SUM(pd.total_ot_hours) AS tong_gio_ot, SUM(pd.overtime_pay) AS tong_tien_ot
FROM payroll_details pd
JOIN employees e ON pd.employee_id = e.id
JOIN departments d ON e.department_id = d.id
JOIN payrolls p ON pd.payroll_id = p.id
WHERE (d.department_name LIKE '%IT%' OR d.department_name LIKE '%Software Development%')
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

### Q129. Danh sách nghỉ phép tuần này. / Q53. Ai đang nghỉ phép tuần này?
```sql
SELECT DISTINCT e.employee_code, e.full_name, r.start_date, r.end_date, rt.name AS loai_nghi
FROM requests r
JOIN employees e ON r.employee_id = e.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.request_group_id = 1 -- Leave
  AND r.status = 'APPROVED'
  AND r.start_date <= DATE_ADD(CURDATE(), INTERVAL (7 - DAYOFWEEK(CURDATE())) DAY)
  AND r.end_date >= DATE_SUB(CURDATE(), INTERVAL (DAYOFWEEK(CURDATE()) - 1) DAY);
```

### Q132. Nhân viên mới tháng này.
```sql
SELECT employee_code, full_name, join_date, department_id
FROM employees
WHERE MONTH(join_date) = MONTH(CURDATE())
  AND YEAR(join_date) = YEAR(CURDATE())
  AND is_deleted = 0;
```

### Q133. Danh sách đơn chờ duyệt.
Xem toàn bộ danh sách các đơn của nhân viên đang chờ duyệt (thường dành cho Admin/HR/Manager).
```sql
SELECT r.request_code, e.full_name AS nguoi_gui, rg.name AS nhom_don, rt.name AS loai_don, r.quantity, r.created_at
FROM requests r
JOIN employees e ON r.employee_id = e.id
JOIN request_groups rg ON r.request_group_id = rg.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.status = 'PENDING'
ORDER BY r.created_at DESC;
```

### Q135. Phòng ban nào có nhiều người OT nhất?
```sql
SELECT d.department_name, COUNT(DISTINCT r.employee_id) AS so_nguoi_ot, SUM(r.quantity) AS tong_gio_ot
FROM requests r
JOIN employees e ON r.employee_id = e.id
JOIN departments d ON e.department_id = d.id
WHERE r.request_group_id = 2 -- Overtime
  AND r.status = 'APPROVED'
  AND MONTH(r.start_date) = MONTH(CURDATE())
  AND YEAR(r.start_date) = YEAR(CURDATE())
GROUP BY d.id, d.department_name
ORDER BY so_nguoi_ot DESC
LIMIT 1;
```

---

## 4. Lương, Thưởng, Khấu trừ & Phụ cấp

### Q56. Lương tháng này của tôi là bao nhiêu? / Q107. lg tháng này bn?
Truy vấn thực lĩnh (net_salary) từ bảng chi tiết bảng lương được chốt.
```sql
SELECT pd.net_salary AS luong_thuc_linh, pd.base_salary AS luong_co_ban, pd.total_gross_income AS tong_thu_nhap, pd.total_deduction AS tong_khau_tru
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

### Q57. Phiếu lương tháng này của tôi. / Q113. phiếu lương tháng 4 / Q116. Xem lương và phiếu lương tháng này.
Hiển thị toàn bộ các khoản thu nhập, bảo hiểm, thuế, khấu trừ của tôi.
```sql
SELECT pd.* 
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE()) -- Thay bằng số 4 nếu là tháng 4
  AND p.payroll_year = YEAR(CURDATE());
```

### Q58. Tổng OT được tính lương tháng này.
Số giờ OT đã được tính thành tiền trong phiếu lương.
```sql
SELECT pd.total_ot_hours AS tong_gio_ot, pd.overtime_pay AS tien_lam_them
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

### Q59. Phụ cấp tháng này của tôi là bao nhiêu?
```sql
-- Lấy từ phiếu lương tháng:
SELECT pd.allowance_amount AS tong_phu_cap
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());

-- Hoặc từ định mức phụ cấp quy định:
SELECT lunch_allowance + fuel_allowance + phone_allowance + other_allowance AS tong_dinh_muc_phu_cap
FROM employee_salaries
WHERE employee_id = :my_employee_id
  AND salary_status = 'ACTIVE';
```

### Q60. Thuế thu nhập cá nhân tháng này.
```sql
SELECT pd.tax_deduction AS thue_tncn
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

### Q61. Lương cơ bản hiện tại của tôi.
```sql
SELECT base_salary AS luong_co_ban_hien_tai
FROM employee_salaries
WHERE employee_id = :my_employee_id
  AND salary_status = 'ACTIVE';
```

### Q62. Tôi nhận lương qua ngân hàng nào?
```sql
SELECT bank_name, account_number, account_holder_name
FROM employee_bank_accounts
WHERE employee_id = :my_employee_id
  AND status = 'ACTIVE';
```

### Q63. Lịch sử lương 6 tháng gần nhất.
```sql
SELECT p.payroll_month, p.payroll_year, pd.base_salary, pd.total_gross_income, pd.net_salary
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND (p.payroll_year * 12 + p.payroll_month) >= (YEAR(CURDATE()) * 12 + MONTH(CURDATE()) - 6)
ORDER BY p.payroll_year DESC, p.payroll_month DESC;
```

### Q64. Thưởng tháng này của tôi.
```sql
SELECT pd.bonus AS thuong_thang_nay
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

### Q65. Khoản khấu trừ tháng này là gì?
```sql
SELECT pd.total_deduction AS tong_khau_tru, pd.insurance_deduction AS bao_hiem_tru, pd.tax_deduction AS thue_tru, pd.union_fee AS kinh_phi_cong_doan, pd.penalty AS tien_phat
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

### Q66. Tiền bảo hiểm bị trừ bao nhiêu?
```sql
SELECT pd.insurance_deduction AS tong_bao_hiem, pd.social_insurance AS BHXH, pd.health_insurance AS BHYT, pd.unemployment_insurance AS BHTN
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

### Q67. Tôi có được thưởng KPI không?
```sql
SELECT pd.performance_salary AS luong_hieu_suat, pd.bonus AS thuong_kpi, pd.kpi_percentage AS phan_tram_hoan_thanh
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

### Q68. Tổng thu nhập năm nay của tôi.
```sql
SELECT SUM(pd.total_gross_income) AS tong_gross_ca_nam, SUM(pd.net_salary) AS tong_net_ca_nam
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_year = YEAR(CURDATE());
```

### Q69. Ngày trả lương gần nhất.
```sql
SELECT p.payment_date, p.payroll_month, p.payroll_year, pd.net_salary
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payment_date IS NOT NULL
ORDER BY p.payment_date DESC
LIMIT 1;
```

### Q70. Tôi đã được tăng lương lần cuối khi nào?
```sql
SELECT effective_from AS ngay_hieu_luc, base_salary AS muc_luong, updated_at AS ngay_cap_nhat
FROM employee_salaries
WHERE employee_id = :my_employee_id
ORDER BY effective_from DESC;
```

### Q101. Lương tháng trước của tôi.
```sql
SELECT pd.net_salary, pd.base_salary, pd.total_gross_income
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
  AND p.payroll_year = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH));
```

### Q121. Xem lương của nhân viên khác.
*(Yêu cầu quyền ADMIN hoặc HR để truy cập)*
```sql
SELECT e.employee_code, e.full_name, es.base_salary, es.lunch_allowance, es.fuel_allowance
FROM employees e
JOIN employee_salaries es ON e.id = es.employee_id
WHERE (e.full_name LIKE '%Nhân viên B%' OR e.employee_code = :employee_code_B)
  AND es.salary_status = 'ACTIVE';
```

### Q122. Danh sách lương toàn công ty.
*(Yêu cầu quyền ADMIN hoặc HR)*
```sql
SELECT e.employee_code, e.full_name, d.department_name, es.base_salary
FROM employees e
JOIN employee_salaries es ON e.id = es.employee_id
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.is_deleted = 0 AND es.salary_status = 'ACTIVE'
ORDER BY es.base_salary DESC;
```

### Q123. Ai có mức lương cao nhất?
*(Yêu cầu quyền ADMIN hoặc HR)*
```sql
SELECT e.employee_code, e.full_name, d.department_name, es.base_salary
FROM employees e
JOIN employee_salaries es ON e.id = es.employee_id
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.is_deleted = 0 AND es.salary_status = 'ACTIVE'
ORDER BY es.base_salary DESC
LIMIT 1;
```

### Q125. Danh sách bảo hiểm của nhân viên.
*(Yêu cầu quyền ADMIN hoặc HR)*
```sql
SELECT e.employee_code, e.full_name, pd.social_insurance AS BHXH, pd.health_insurance AS BHYT, pd.unemployment_insurance AS BHTN, p.payroll_month, p.payroll_year
FROM payroll_details pd
JOIN employees e ON pd.employee_id = e.id
JOIN payrolls p ON pd.payroll_id = p.id
WHERE p.payroll_month = MONTH(CURDATE()) 
  AND p.payroll_year = YEAR(CURDATE());
```

### Q134. Tổng quỹ lương tháng này.
*(Yêu cầu quyền ADMIN hoặc HR)*
```sql
SELECT SUM(pd.total_gross_income) AS tong_gross_toan_cty, 
       SUM(pd.net_salary) AS tong_net_toan_cty,
       SUM(pd.total_hr_cost) AS tong_chi_phi_nhan_su
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());
```

---

## 5. Quy trình phê duyệt & Đơn từ

### Q71. Đơn của tôi đang ở trạng thái nào?
```sql
SELECT r.request_code, rg.name AS nhom_don, rt.name AS loai_don, r.status, r.created_at
FROM requests r
JOIN request_groups rg ON r.request_group_id = rg.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.employee_id = :my_employee_id
ORDER BY r.created_at DESC
LIMIT 5;
```

### Q72. Tôi đã gửi bao nhiêu đơn tháng này?
```sql
SELECT COUNT(*) AS tong_don_da_gui_thang_nay
FROM requests
WHERE employee_id = :my_employee_id
  AND MONTH(created_at) = MONTH(CURDATE())
  AND YEAR(created_at) = YEAR(CURDATE())
  AND status != 'DRAFT';
```

### Q73. Đơn OT của tôi đã duyệt chưa?
```sql
SELECT request_code, quantity AS so_gio, start_date, status, approved_at
FROM requests
WHERE employee_id = :my_employee_id
  AND request_group_id = 2 -- 2 là Overtime
ORDER BY created_at DESC
LIMIT 1;
```

### Q74. Ai đang xử lý đơn của tôi?
Xem người đang phê duyệt cấp hiện tại của các đơn đang chờ xử lý.
```sql
SELECT r.request_code, e.full_name AS nguoi_phe_duyet, e.company_email, r.status, r.current_approval_level
FROM requests r
JOIN employees e ON r.current_approver_id = e.id
WHERE r.employee_id = :my_employee_id
  AND r.status = 'PENDING';
```

### Q75. Lịch sử đơn từ của tôi.
```sql
SELECT r.request_code, rg.name AS nhom_don, rt.name AS loai_don, r.quantity, r.start_date, r.end_date, r.status, r.created_at
FROM requests r
JOIN request_groups rg ON r.request_group_id = rg.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.employee_id = :my_employee_id
ORDER BY r.created_at DESC;
```

### Q76. Tôi có đơn nào bị từ chối không?
```sql
SELECT r.request_code, rg.name AS nhom_don, rt.name AS loai_don, r.quantity, r.status, r.rejected_at, r.description
FROM requests r
JOIN request_groups rg ON r.request_group_id = rg.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.employee_id = :my_employee_id
  AND r.status = 'REJECTED'
ORDER BY r.rejected_at DESC;
```

### Q77. Đơn gần nhất tôi tạo là gì?
```sql
SELECT r.request_code, rg.name AS nhom_don, rt.name AS loai_don, r.quantity, r.status, r.created_at
FROM requests r
JOIN request_groups rg ON r.request_group_id = rg.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.employee_id = :my_employee_id
ORDER BY r.created_at DESC
LIMIT 1;
```

### Q78. Tôi có bao nhiêu đơn chờ duyệt?
```sql
SELECT COUNT(*) AS so_don_cho_duyet
FROM requests
WHERE employee_id = :my_employee_id
  AND status = 'PENDING';
```

### Q79. Danh sách đơn của phòng tôi.
Truy vấn các đơn từ của nhân viên cùng phòng ban với tôi.
```sql
SELECT e.full_name, e.employee_code, r.request_code, rg.name AS nhom_don, rt.name AS loai_don, r.status, r.created_at
FROM requests r
JOIN employees e ON r.employee_id = e.id
JOIN request_groups rg ON r.request_group_id = rg.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE e.department_id = (SELECT department_id FROM employees WHERE id = :my_employee_id)
ORDER BY r.created_at DESC;
```

### Q80. Đơn nào đã được duyệt hôm nay?
```sql
SELECT r.request_code, e.full_name AS nguoi_de_xuat, rg.name AS nhom_don, rt.name AS loai_don, r.approved_at
FROM requests r
JOIN employees e ON r.employee_id = e.id
JOIN request_groups rg ON r.request_group_id = rg.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.status = 'APPROVED'
  AND DATE(r.approved_at) = CURDATE()
ORDER BY r.approved_at DESC;
```

### Q103. các đơn hôm nay của tôi đã được duyệt chưa?
```sql
SELECT r.request_code, rg.name AS nhom_don, rt.name AS loai_don, r.status, r.approved_at
FROM requests r
JOIN request_groups rg ON r.request_group_id = rg.id
JOIN request_types rt ON r.request_type_id = rt.id
WHERE r.employee_id = :my_employee_id
  AND DATE(r.created_at) = CURDATE();
```

---

## 6. Thông tin nhân viên & Sơ đồ tổ chức

### Q81. Mã nhân viên của tôi là gì?
```sql
SELECT employee_code
FROM employees
WHERE id = :my_employee_id;
```

### Q82. Tôi thuộc phòng ban nào?
```sql
SELECT d.id AS ma_phong, d.department_name AS ten_phong
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.id = :my_employee_id;
```

### Q83. Chức vụ hiện tại của tôi.
```sql
SELECT p.position_name AS chuc_vu
FROM employees e
JOIN positions p ON e.position_id = p.id
WHERE e.id = :my_employee_id;
```

### Q84. Người quản lý trực tiếp của tôi là ai? / Q104. Người quản lý của tôi là ai? / Q111. ai quản lý tui vậy
```sql
SELECT m.id AS ma_quan_ly, m.employee_code, m.full_name AS ten_quan_ly, m.company_email
FROM employees e
JOIN employees m ON e.direct_manager_id = m.id
WHERE e.id = :my_employee_id;
```

### Q85. Tôi vào công ty ngày nào?
```sql
SELECT join_date AS ngay_vao_lam
FROM employees
WHERE id = :my_employee_id;
```

### Q86. Số điện thoại của tôi trong hệ thống.
```sql
SELECT phone_number
FROM employees
WHERE id = :my_employee_id;
```

### Q87. Email công ty của tôi.
```sql
SELECT company_email
FROM employees
WHERE id = :my_employee_id;
```

### Q88. Địa chỉ hiện tại của tôi.
```sql
SELECT current_address
FROM employees
WHERE id = :my_employee_id;
```

### Q89. Tôi đang làm việc tại chi nhánh nào?
*(Thông tin chi nhánh không lưu dạng bảng độc lập, truy vấn này lấy thông tin cơ quan và địa chỉ của nhân viên để ước tính)*
```sql
SELECT e.full_name, d.department_name, asc_conf.office_latitude, asc_conf.office_longitude
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN attendance_security_configs asc_conf ON asc_conf.id = 1
WHERE e.id = :my_employee_id;
```

### Q90. Danh sách nhân viên phòng IT.
```sql
SELECT e.employee_code, e.full_name, e.company_email, p.position_name
FROM employees e
JOIN departments d ON e.department_id = d.id
LEFT JOIN positions p ON e.position_id = p.id
WHERE (d.department_name LIKE '%IT%' OR d.department_name LIKE '%Software Development%')
  AND e.is_deleted = 0;
```

### Q91. Công ty hiện có bao nhiêu nhân viên? / Q131. Tổng số nhân viên công ty.
```sql
SELECT COUNT(*) AS tong_so_nhan_vien_dang_lam
FROM employees
WHERE is_deleted = 0 AND employment_status = 'ACTIVE';
```

### Q92. Ai là trưởng phòng Marketing?
```sql
SELECT e.employee_code, e.full_name, e.company_email
FROM departments d
JOIN employees e ON d.manager_employee_id = e.id
WHERE d.department_name = 'Marketing';
```

### Q93. Thông tin nhân viên mã NV001.
```sql
SELECT *
FROM employees
WHERE employee_code = 'NV001';
```

### Q94. Sinh nhật của tôi là ngày nào?
```sql
SELECT date_of_birth
FROM employees
WHERE id = :my_employee_id;
```

### Q95. Tôi đã làm việc bao nhiêu năm tại công ty?
Tính thâm niên làm việc dạng Số năm + Số tháng lẻ.
```sql
SELECT join_date, 
       TIMESTAMPDIFF(YEAR, join_date, CURDATE()) AS so_nam_lam_viec,
       TIMESTAMPDIFF(MONTH, join_date, CURDATE()) % 12 AS so_thang_le
FROM employees
WHERE id = :my_employee_id;
```

---

## 7. KPI & Hiệu suất

### Q96. KPI tháng này của tôi là bao nhiêu?
```sql
SELECT score_result AS kpi_score, total_score AS tong_diem, status, manager_comment
FROM performance_reviews
WHERE employee_id = :my_employee_id
  AND review_month = MONTH(CURDATE())
  AND review_year = YEAR(CURDATE());
```

### Q97. Tôi đã hoàn thành bao nhiêu phần trăm KPI?
```sql
-- Dựa trên phần trăm KPI chốt trong bảng lương:
SELECT pd.kpi_percentage AS phan_tram_kpi_payroll
FROM payroll_details pd
JOIN payrolls p ON pd.payroll_id = p.id
WHERE pd.employee_id = :my_employee_id
  AND p.payroll_month = MONTH(CURDATE())
  AND p.payroll_year = YEAR(CURDATE());

-- Hoặc ước tính tỷ lệ đạt điểm đánh giá trên thang điểm tối đa (thang 10):
SELECT (total_score / 10.0) * 100 AS phan_tram_dat_kpi
FROM performance_reviews
WHERE employee_id = :my_employee_id
  AND review_month = MONTH(CURDATE())
  AND review_year = YEAR(CURDATE());
```

### Q98. Điểm đánh giá hiệu suất gần nhất của tôi.
```sql
SELECT review_month, review_year, total_score, score_result, manager_comment
FROM performance_reviews
WHERE employee_id = :my_employee_id
ORDER BY review_year DESC, review_month DESC
LIMIT 1;
```

### Q99. Ai có KPI cao nhất phòng?
Tìm nhân viên đạt tổng điểm đánh giá cao nhất trong cùng phòng ban với tôi ở tháng này.
```sql
SELECT e.employee_code, e.full_name, pr.total_score
FROM performance_reviews pr
JOIN employees e ON pr.employee_id = e.id
WHERE e.department_id = (SELECT department_id FROM employees WHERE id = :my_employee_id)
  AND pr.review_month = MONTH(CURDATE())
  AND pr.review_year = YEAR(CURDATE())
ORDER BY pr.total_score DESC
LIMIT 1;
```

### Q100. KPI trung bình của phòng Sales.
```sql
SELECT AVG(pr.total_score) AS kpi_trung_binh
FROM performance_reviews pr
JOIN employees e ON pr.employee_id = e.id
JOIN departments d ON e.department_id = d.id
WHERE d.department_name LIKE '%Sales%'
  AND pr.review_month = MONTH(CURDATE())
  AND pr.review_year = YEAR(CURDATE());
```

### Q120. Hiển thị KPI và task quá hạn của tôi.
*(Do schema không có bảng quản lý công việc (task) chi tiết dạng Kanban/To-do ngoại trừ tiến trình onboarding `onboarding_progress` và nhiệm vụ onboarding `onboarding_tasks`, truy vấn này lấy tổng quan điểm đánh giá và nhiệm vụ onboarding của nhân viên)*
```sql
SELECT pr.total_score AS diem_kpi, op.overall_status, op.progress_percentage, 
       (op.total_tasks_count - op.completed_tasks_count) AS so_nhiem_vu_chua_hoan_thanh
FROM performance_reviews pr
LEFT JOIN onboarding_progress op ON pr.employee_id = op.employee_id
WHERE pr.employee_id = :my_employee_id
ORDER BY pr.review_year DESC, pr.review_month DESC
LIMIT 1;
```

### Q130. Nhân viên nào KPI thấp nhất?
```sql
SELECT e.employee_code, e.full_name, pr.total_score
FROM performance_reviews pr
JOIN employees e ON pr.employee_id = e.id
WHERE pr.review_month = MONTH(CURDATE())
  AND pr.review_year = YEAR(CURDATE())
ORDER BY pr.total_score ASC
LIMIT 1;
```
