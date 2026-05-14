import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { PayrollEntity } from './payroll.entity.js';
import { EmployeeEntity } from './employee.entity.js';

/**
 * Bảng lưu trữ file đính kèm cho từng bảng lương
 */
@Entity('payroll_attachments')
export class PayrollAttachmentEntity extends BaseEntity {
    @Column({ name: 'payroll_id', type: 'int' })
    payrollId;

    /** Tên file gốc do người dùng đặt (VD: "QD-luong-thang-2.pdf") */
    @Column({ name: 'file_name', type: 'varchar', length: 500 })
    fileName;

    /** Đường dẫn lưu trữ trên server tương đối (VD: uploads/payroll/12/1714000000-abc.pdf) */
    @Column({ name: 'file_path', type: 'varchar', length: 1000 })
    filePath;

    /** Dung lượng file theo bytes */
    @Column({ name: 'file_size', type: 'bigint', nullable: true })
    fileSize;

    /** MIME type (VD: application/pdf, image/jpeg) */
    @Column({ name: 'mime_type', type: 'varchar', length: 200, nullable: true })
    mimeType;

    /** ID nhân viên hoặc user đã upload */
    @Column({ name: 'uploaded_by', type: 'int', nullable: true })
    uploadedBy;

    /** Tên người upload (denormalized để hiển thị nhanh) */
    @Column({ name: 'uploaded_by_name', type: 'varchar', length: 255, nullable: true })
    uploadedByName;

    // ── Relations ──
    @ManyToOne(() => PayrollEntity)
    @JoinColumn({ name: 'payroll_id' })
    payroll;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'uploaded_by' })
    uploader;
}
