import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('positions')
export class PositionEntity extends BaseEntity {
    @Column({ name: 'position_name' })
    positionName: string;
}
