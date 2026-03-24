import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

/**
 * Bảng overtime_types — danh mục loại OT
 * Seed sẵn: WEEKDAY, WEEKEND, HOLIDAY
 * Không cần CRUD UI
 */
@Entity('overtime_types')
export class OvertimeTypeEntity extends BaseEntity {
    @Column({ name: 'code', type: 'varchar', length: 50, unique: true })
    code; // VD: WEEKDAY, WEEKEND, HOLIDAY

    @Column({ name: 'name', type: 'varchar', length: 100 })
    name; // VD: "OT ngày thường"

    @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
    description;
}
