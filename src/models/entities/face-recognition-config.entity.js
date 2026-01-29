import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('face_recognition_configs')
export class FaceRecognitionConfigEntity extends BaseEntity {
    @Column({ name: 'confidence_threshold', type: 'decimal', precision: 5, scale: 2 })
    confidenceThreshold;

    @Column({ name: 'model_version', nullable: true, type: 'varchar' })
    modelVersion;
}
