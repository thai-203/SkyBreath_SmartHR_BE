import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestEntity } from './request.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { RoleEntity } from './role.entity.js';

/**
 * Snapshot của từng cấp duyệt trong workflow tại thời điểm đơn được submit.
 * Tách biệt với request_group_workflows để không bị ảnh hưởng khi admin sửa config.
 */
@Entity('request_approval_levels')
export class RequestApprovalLevelEntity extends BaseEntity {
    @Column({ name: 'request_id', type: 'int' })
    requestId;

    @Column({ name: 'level_order', type: 'int' })
    levelOrder; // Thứ tự cấp (1, 2, 3...)

    @Column({ name: 'level_name', type: 'varchar', length: 255 })
    levelName; // VD: "Quản lý trực tiếp", "Giám đốc"

    @Column({ name: 'approver_type', type: 'varchar', length: 50 })
    approverType; // DIRECT_MANAGER | ROLE (snapshot)

    @Column({ name: 'approver_role_id', type: 'int', nullable: true })
    approverRoleId; // Role được phân quyền (snapshot)

    @Column({ name: 'approver_employee_id', type: 'int', nullable: true })
    approverEmployeeId; // Người duyệt thực tế đã được resolve

    @Column({ name: 'status', type: 'varchar', length: 50, default: 'PENDING' })
    status; // PENDING | APPROVED | REJECTED | REVOKED

    @Column({ name: 'actioned_at', type: 'datetime', nullable: true })
    actionedAt; // Thời điểm action

    @Column({ name: 'actioned_by_employee_id', type: 'int', nullable: true })
    actionedByEmployeeId; // Người thực hiện (audit - có thể khác approverEmployeeId nếu admin can thiệp)

    @Column({ type: 'text', nullable: true })
    comment; // Lý do từ chối hoặc ghi chú khi hủy duyệt

    @Column({ name: 'notify_approver', type: 'boolean', default: true })
    notifyApprover; // Có gửi thông báo không (snapshot)

    // Relations
    @ManyToOne(() => RequestEntity)
    @JoinColumn({ name: 'request_id' })
    request;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'approver_employee_id' })
    approver;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'actioned_by_employee_id' })
    actionedBy;

    @ManyToOne(() => RoleEntity)
    @JoinColumn({ name: 'approver_role_id' })
    approverRole;
}
