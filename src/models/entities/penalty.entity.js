import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('penalties')
export class PenaltyEntity extends BaseEntity {
    @Column({ name: 'violation_type', type: 'varchar' })
    violationType;

    @Column({ name: 'effective_from', type: 'date' })
    effectiveFrom;

    @Column({ name: 'effective_to', type: 'date', nullable: true })
    effectiveTo;

    @Column({ name: 'from_minute', type: 'int' })
    fromMinute;

    @Column({ name: 'to_minute', type: 'int' })
    toMinute;

    @Column({ name: 'converted_hours', type: 'decimal', precision: 10, scale: 2 })
    convertedHours;

    @Column({ name: 'note', type: 'text', nullable: true })
    note;

    @Column({ name: 'status', type: 'varchar', default: 'ACTIVE' })
    status;
}
