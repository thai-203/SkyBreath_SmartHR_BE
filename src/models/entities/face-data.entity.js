import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('face_data')
export class FaceDataEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'face_vector', type: 'text' })
    faceVector;

    @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
    imageUrl;

    @Column({ name: 'registered_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    registeredAt;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
