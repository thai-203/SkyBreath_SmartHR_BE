import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('face_recognition_configs')
export class FaceRecognitionConfigEntity extends BaseEntity {
    @Column({ name: 'confidence_threshold', type: 'decimal', precision: 5, scale: 2 })
    confidenceThreshold: number;

    @Column({ name: 'model_version', nullable: true })
    modelVersion: string;
}
