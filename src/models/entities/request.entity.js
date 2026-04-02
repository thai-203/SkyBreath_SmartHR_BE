import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { RequestTypeEntity } from './request-type.entity.js';
import { RequestGroupEntity } from './request-group.entity.js';

@Entity('requests')
export class RequestEntity extends BaseEntity {
    @Column({ name: 'request_code', type: 'varchar', length: 50, unique: true, nullable: true })
    requestCode; // VD: REQ-20260401-001

    // Người được tạo đơn (người hưởng lợi)
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    // Người thực hiện tạo đơn (có thể là HR tạo hộ)
    @Column({ name: 'created_by_employee_id', type: 'int', nullable: true })
    createdByEmployeeId;

    @Column({ name: 'request_type_id', type: 'int' })
    requestTypeId;

    @Column({ name: 'request_group_id', type: 'int' })
    requestGroupId;

    @Column({
        name: 'status',
        type: 'varchar',
        length: 50,
        default: 'DRAFT',
    })
    status; // DRAFT | PENDING | APPROVED | REJECTED | CANCELLED

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate;

    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime;

    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime;

    // Snapshot từ policy khi tạo đơn
    @Column({ name: 'is_worked_time', type: 'boolean', default: false })
    isWorkedTime;

    @Column({ name: 'unit', type: 'varchar', length: 50, nullable: true })
    unit; // DAY | HOUR | MINUTE | TIME

    @Column({ name: 'quantity', type: 'decimal', precision: 10, scale: 2, nullable: true })
    quantity; // Số lượng (tự tính hoặc nhập tay)

    @Column({ type: 'text', nullable: true })
    description;

    // Tracking workflow progress
    @Column({ name: 'current_approval_level', type: 'int', default: 0 })
    currentApprovalLevel; // 0 = chưa gửi, 1+ = đang ở cấp n

    @Column({ name: 'total_approval_levels', type: 'int', default: 0 })
    totalApprovalLevels; // Snapshot tổng số cấp khi submit

    @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
    submittedAt;

    @Column({ name: 'approved_at', type: 'datetime', nullable: true })
    approvedAt;

    @Column({ name: 'rejected_at', type: 'datetime', nullable: true })
    rejectedAt;

    @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
    cancelledAt;

    @Column({ name: 'cancelled_by_employee_id', type: 'int', nullable: true })
    cancelledByEmployeeId;

    // Relations
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
}
