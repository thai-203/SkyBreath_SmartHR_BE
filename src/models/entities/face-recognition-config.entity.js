import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('face_recognition_configs')
export class FaceRecognitionConfigEntity extends BaseEntity {
  // Recognition
  @Column({ type: 'decimal', precision: 5, scale: 3 })
  recognitionThreshold;

  @Column({ type: 'varchar', default: 'cosine' })
  similarityMetric;

  @Column({ type: 'int', default: 5 })
  maxEmbeddingsPerUser;

  // Anti-Spoof
  @Column({ type: 'decimal', precision: 5, scale: 3 })
  spoofThreshold;

  @Column({ type: 'varchar', default: 'MULTI_FRAME' })
  livenessMode;

  @Column({ type: 'int', default: 10 })
  requiredFrames;

  // Camera
  @Column({ type: 'int', default: 1000 })
  captureIntervalMs;

  @Column({ type: 'int', default: 80 })
  faceDetectionMinSize;

  @Column({ type: 'int', default: 1 })
  maxFacesAllowed;

  // Model
  @Column({ type: 'varchar', default: 'buffalo_l' })
  arcfaceModelName;

  @Column({ type: 'varchar', nullable: true })
  antiSpoofModelVersion;

  @Column({ type: 'boolean', default: true })
  saveAttendanceImage;
}
