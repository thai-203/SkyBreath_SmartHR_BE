import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { RequestTypeEntity } from './request-type.entity.js';
import { RequestGroupEntity } from './request-group.entity.js';

@Entity('requests')
export class RequestEntity extends BaseEntity {
    @Column({ name: 'request_code', type: 'varchar', length: 50, unique: true, nullable: true })
    requestCode; // Mã đơn (REQ-20260401-001)

    @Column({ name: 'request_group_id', type: 'int' })
    requestGroupId; // Nhóm đơn

    @Column({ name: 'request_type_id', type: 'int' })
    requestTypeId; // Lý do / loại đơn

    // Tracking số cấp duyệt thay cho workflow_id lock tại thời điểm submit
    @Column({ name: 'total_approval_levels', type: 'int', default: 0 })
    totalApprovalLevels; 

    @Column({ name: 'is_worked_time', type: 'boolean', default: false })
    isWorkedTime; // Tính công

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate; // Từ ngày

    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime; // Từ giờ

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate; // Đến ngày

    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime; // Đến giờ

    @Column({ name: 'unit', type: 'varchar', length: 50, nullable: true })
    unit; // DAY | HOUR | MINUTE | TIME

    @Column({ name: 'quantity', type: 'decimal', precision: 10, scale: 2, nullable: true })
    quantity; // Số lượng theo policy tính ra

    @Column({ type: 'text', nullable: true })
    description; // Mô tả lý do chi tiết

    @Column({ name: 'status', type: 'varchar', length: 50, default: 'DRAFT' })
    status; // DRAFT | PENDING | APPROVED | REJECTED | CANCELLED | REVOKED

    @Column({ name: 'current_approval_level', type: 'int', default: 0 })
    currentApprovalLevel; // Đang ở bước mấy (cấp duyệt thứ mấy)

    @Column({ name: 'current_approver_id', type: 'int', nullable: true })
    currentApproverId; // Đang chờ ai duyệt (employee_id)

    @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
    submittedAt; // Thời điểm gửi duyệt

    @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
    cancelledAt; // Thời điểm hủy

    @Column({ name: 'approved_at', type: 'datetime', nullable: true })
    approvedAt; // Thời điểm duyệt xong

    @Column({ name: 'rejected_at', type: 'datetime', nullable: true })
    rejectedAt; // Thời điểm từ chối

    // --- Audit Links (Nằm cuối) ---
    @Column({ name: 'employee_id', type: 'int' })
    employeeId; // Người được tạo đơn (hưởng lợi)

    @Column({ name: 'created_by_employee_id', type: 'int', nullable: true })
    createdByEmployeeId; // Người thao tác tạo đơn

    @Column({ name: 'cancelled_by_employee_id', type: 'int', nullable: true })
    cancelledByEmployeeId; // Người thao tác hủy đơn

    // --- Relations ---
    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'created_by_employee_id' })
    createdByEmployee;

    @ManyToOne(() => RequestTypeEntity)
    @JoinColumn({ name: 'request_type_id' })
    requestType;

    @ManyToOne(() => RequestGroupEntity)
    @JoinColumn({ name: 'request_group_id' })
    requestGroup;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'cancelled_by_employee_id' })
    cancelledByEmployee;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'current_approver_id' })
    currentApprover;
}
