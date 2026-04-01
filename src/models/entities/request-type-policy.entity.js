import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestTypeEntity } from './request-type.entity.js';

@Entity('request_type_policies')
export class RequestTypePolicyEntity extends BaseEntity {
    @Column({ name: 'request_type_id', type: 'int', unique: true })
    requestTypeId;

    @Column({ name: 'tracking_cycle', type: 'varchar', length: 50 })
    trackingCycle; // DAY, WEEK, MONTH, YEAR

    @Column({ name: 'unit', type: 'varchar', length: 50 })
    unit; // DAY, HOUR, MINUTE, TIME

    @Column({ name: 'max_quantity', type: 'decimal', precision: 10, scale: 2 })
    maxQuantity; // Số lượng max

    @Column({ name: 'is_worked_time', type: 'boolean', default: false })
    isWorkedTime; // Tính vào công hay không

    @OneToOne(() => RequestTypeEntity, (requestType) => requestType.policy)
    @JoinColumn({ name: 'request_type_id' })
    requestType;
}
