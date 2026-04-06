import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { UserEntity } from './user.entity.js';

@Entity('ai_configurations')
export class AiConfigurationEntity extends BaseEntity {
    @Column({ name: 'config_key', type: 'varchar', length: 100, unique: true })
    configKey;

    @Column({ name: 'config_value', type: 'text' })
    configValue;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description;

    @Column({ name: 'ai_model', type: 'varchar', length: 100, nullable: true })
    aiModel;

    @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
    status; // ACTIVE, INACTIVE

    // Audit fields are handled by BaseEntity mostly, but the database defines created_by and updated_by explicitly
    @Column({ name: 'created_by', type: 'int', nullable: true })
    createdBy;

    @Column({ name: 'updated_by', type: 'int', nullable: true })
    updatedBy;

    // Relations
    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'created_by' })
    creator;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'updated_by' })
    updater;
}
