import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestGroupEntity } from './request-group.entity.js';
import { RoleEntity } from './role.entity.js';

@Entity('request_group_workflows')
export class RequestGroupWorkflowEntity extends BaseEntity {
    @Column({ name: 'request_group_id', type: 'int' })
    requestGroupId;

    @Column({ name: 'level_order', type: 'int' })
    levelOrder; // Thứ tự duyệt (1, 2, 3)

    @Column({ name: 'level_name', type: 'varchar', length: 255 })
    levelName; // Tên cấp duyệt (VD: Quản lý trực tiếp, Giám đốc)

    @Column({ name: 'approver_role_id', type: 'int' })
    approverRoleId; // FK tới role của cấp duyệt đó (VD: Role Code của HR)

    @Column({ name: 'notify_approver', type: 'boolean', default: true })
    notifyApprover; // Cờ thông báo cho người duyệt

    @ManyToOne(() => RequestGroupEntity, (group) => group.workflows)
    @JoinColumn({ name: 'request_group_id' })
    requestGroup;

    @ManyToOne(() => RoleEntity)
    @JoinColumn({ name: 'approver_role_id' })
    approverRole;
}
