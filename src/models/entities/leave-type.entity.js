import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('leave_types')
export class LeaveTypeEntity extends BaseEntity {
    @Column({ name: 'leave_type_name', type: 'varchar' })
    leaveTypeName;

    @Column({ name: 'is_paid', default: false, type: 'boolean' })
    isPaid;
}
