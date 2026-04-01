import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestGroupEntity } from './request-group.entity.js';
import { RoleEntity } from './role.entity.js';
import { UserEntity } from './user.entity.js';

@Entity('request_group_workflows')
export class RequestGroupWorkflowEntity extends BaseEntity {
    @Column({ name: 'request_group_id', type: 'int' })
    requestGroupId;

    @Column({ name: 'level_order', type: 'int' })
    levelOrder; // Thứ tự duyệt (1, 2, 3)

    @Column({ name: 'level_name', type: 'varchar', length: 255 })
    levelName; // Tên cấp duyệt (VD: Quản lý trực tiếp, Giám đốc)

    @Column({ name: 'approver_type', type: 'varchar', length: 50, default: 'DIRECT_MANAGER' })
    approverType; // DIRECT_MANAGER | ROLE

    @Column({ name: 'approver_role_id', type: 'int', nullable: true })
    approverRoleId; // FK tới role (chỉ khi approverType = 'ROLE')

    @Column({ name: 'approver_user_id', type: 'int', nullable: true })
    approverUserId; // FK tới user cụ thể (chỉ khi approverType = 'ROLE')

    @Column({ name: 'notify_approver', type: 'boolean', default: true })
    notifyApprover; // Cờ thông báo cho người duyệt

    @ManyToOne(() => RequestGroupEntity, (group) => group.workflows)
    @JoinColumn({ name: 'request_group_id' })
    requestGroup;

    @ManyToOne(() => RoleEntity)
    @JoinColumn({ name: 'approver_role_id' })
    approverRole;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'approver_user_id' })
    approverUser;
}
