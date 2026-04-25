import { AppDataSource } from '../database/data-source.js';
import { PayrollAttachmentEntity } from '../models/entities/payroll-attachment.entity.js';

export class PayrollAttachmentRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(PayrollAttachmentEntity);
    }

    /** Lấy tất cả file đính kèm của một bảng lương (chưa bị xóa) */
    async findByPayroll(payrollId) {
        return this.repository.find({
            where: { payrollId, isDeleted: false },
            order: { createdAt: 'DESC' },
        });
    }

    /** Tìm một file theo id */
    async findById(id) {
        return this.repository.findOne({ where: { id, isDeleted: false } });
    }

    /** Lưu một bản ghi file mới */
    async create(data) {
        const attachment = this.repository.create(data);
        return this.repository.save(attachment);
    }

    /** Soft-delete: đánh dấu isDeleted, không xóa record DB */
    async softDelete(id) {
        return this.repository.update(id, { isDeleted: true, deletedAt: new Date() });
    }
}
