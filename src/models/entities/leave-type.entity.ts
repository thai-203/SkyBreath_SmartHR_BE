import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('leave_types')
export class LeaveTypeEntity extends BaseEntity {
    @Column({ name: 'leave_type_name' })
    leaveTypeName: string;

    @Column({ name: 'is_paid', default: false })
    isPaid: boolean;
}
