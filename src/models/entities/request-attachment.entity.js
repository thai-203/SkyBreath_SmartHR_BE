import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestEntity } from './request.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('request_attachments')
export class RequestAttachmentEntity extends BaseEntity {
    @Column({ name: 'request_id', type: 'int' })
    requestId;

    @Column({ name: 'file_name', type: 'varchar', length: 500 })
    fileName; // Tên file gốc

    @Column({ name: 'file_path', type: 'varchar', length: 1000 })
    filePath; // Đường dẫn lưu trữ tương đối (VD: uploads/requests/1/abc.pdf)

    @Column({ name: 'file_size', type: 'bigint', nullable: true })
    fileSize; // Dung lượng bytes

    @Column({ name: 'mime_type', type: 'varchar', length: 200, nullable: true })
    mimeType; // VD: application/pdf, image/jpeg

    @Column({ name: 'uploaded_by_employee_id', type: 'int', nullable: true })
    uploadedByEmployeeId;

    // Relations
    @ManyToOne(() => RequestEntity)
    @JoinColumn({ name: 'request_id' })
    request;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'uploaded_by_employee_id' })
    uploadedBy;
}
