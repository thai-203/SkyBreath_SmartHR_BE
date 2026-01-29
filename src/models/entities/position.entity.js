import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('positions')
export class PositionEntity extends BaseEntity {
    @Column({ name: 'position_name', type: 'varchar' })
    positionName;
}
