import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('face_data')
export class FaceDataEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'face_vector', type: 'text' })
    faceVector: string;

    @Column({ name: 'registered_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    registeredAt: Date;

    @OneToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
