import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Column } from 'typeorm';
import { OvertimeRuleEntity } from './overtime-rule.entity.js';
import { DepartmentEntity } from './department.entity.js';

@Entity('overtime_rule_departments')
export class OvertimeRuleDepartmentEntity {
    @PrimaryColumn({ name: 'overtime_rule_id', type: 'int' })
    overtimeRuleId;

    @PrimaryColumn({ name: 'department_id', type: 'int' })
    departmentId;

    @ManyToOne(() => OvertimeRuleEntity)
    @JoinColumn({ name: 'overtime_rule_id' })
    overtimeRule;

    @ManyToOne(() => DepartmentEntity)
    @JoinColumn({ name: 'department_id' })
    department;

    @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt;

    @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt;

    @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
    deletedAt;

    @Column({ name: 'is_deleted', type: 'boolean', default: false })
    isDeleted;
}
