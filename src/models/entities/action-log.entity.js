import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { UserEntity } from './user.entity.js';

export const ACTION_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
};

@Entity('action_logs')
export class ActionLogEntity extends BaseEntity {
  @Column({ name: 'user_id', nullable: true, type: 'int' })
  userId;

  @Column({ name: 'action_type', type: 'varchar' })
  actionType;

  @Column({ name: 'target_table', nullable: true, type: 'varchar' })
  targetTable;

  @Column({ name: 'target_record_id', nullable: true, type: 'int' })
  targetRecordId;

  @Column({ name: 'before_data', type: 'json', nullable: true })
  beforeData;

  @Column({ name: 'after_data', type: 'json', nullable: true })
  afterData;

  @Column({ name: 'changed_fields', type: 'json', nullable: true })
  changedFields;

  @Column({ type: 'text', nullable: true })
  description;

  @Column({ name: 'request_ip', nullable: true, type: 'varchar' })
  requestIp;

  @Column({ name: 'user_agent', nullable: true, type: 'varchar' })
  userAgent;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ACTION_STATUS,
    default: ACTION_STATUS.SUCCESS,
  })
  status;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage;

  // Optional: store an evidence image URL/path (e.g. attendance failed photo)
  @Column({ name: 'evidence_image_url', type: 'text', nullable: true })
  evidenceImageUrl;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user;
}
