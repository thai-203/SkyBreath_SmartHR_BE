import { AppDataSource } from '../database/data-source.js';
import { AiConfigurationEntity } from '../models/entities/ai-configuration.entity.js';

export class AiConfigurationsService {
    constructor() {
        // Khởi tạo repository truy cập bảng cấu hình AI
        this.repo = AppDataSource.getRepository(AiConfigurationEntity);
    }

    // Lấy cấu hình AI đang hoạt động (ACTIVE)
    async getActiveConfig() {
        return await this.repo.findOne({ where: { status: 'ACTIVE' } });
    }

    // Lấy toàn bộ danh sách cấu hình AI, kèm theo tên của người tạo và người cập nhật gần nhất
    async getAll() {
        const configs = await this.repo.find({
            order: { createdAt: 'DESC' },
            relations: ['creator', 'updater']
        });
        
        return configs.map(c => ({
            ...c,
            creatorName: c.creator?.fullName,
            updaterName: c.updater?.fullName
        }));
    }

    // Tạo cấu hình AI mới
    async create(data, userId) {
        // Quy tắc: Chỉ cho phép tối đa 1 cấu hình AI ở trạng thái ACTIVE tại một thời điểm
        if (data.status === 'ACTIVE') {
            const activeConfig = await this.getActiveConfig();
            if (activeConfig) {
                throw new Error('Đã có một cấu hình AI đang ở trạng thái ACTIVE. Vui lòng tắt cấu hình cũ trước khi bật cấu hình mới.');
            }
        }
        
        // Đảm bảo configKey là độc nhất (unique)
        const existing = await this.repo.findOne({ where: { configKey: data.configKey } });
        if (existing) {
             throw new Error('Key cấu hình này đã tồn tại.');
        }

        // Tạo bản ghi mới gắn ID người tạo
        const newConfig = this.repo.create({
            ...data,
            createdBy: userId,
        });

        return await this.repo.save(newConfig);
    }

    // Cập nhật cấu hình AI hiện có
    async update(id, data, userId) {
        // Kiểm tra sự tồn tại của cấu hình
        const config = await this.repo.findOne({ where: { id } });
        if (!config) throw new Error('Cấu hình không tồn tại.');

        // Kiểm tra quy tắc 1 ACTIVE khi chuyển đổi trạng thái cấu hình sang ACTIVE
        if (data.status === 'ACTIVE' && config.status !== 'ACTIVE') {
             const activeConfig = await this.getActiveConfig();
             if (activeConfig && activeConfig.id !== Number(id)) {
                 throw new Error('Đã có một cấu hình AI khác đang ở trạng thái ACTIVE. Vui lòng tắt cấu hình cũ trước.');
             }
        }

        // Đảm bảo không đổi sang một configKey đã được sử dụng bởi cấu hình khác
        if (data.configKey && data.configKey !== config.configKey) {
             const existing = await this.repo.findOne({ where: { configKey: data.configKey } });
             if (existing) {
                  throw new Error('Key cấu hình này đã tồn tại.');
             }
        }

        // Áp dụng dữ liệu mới và cập nhật ID người sửa gần nhất
        Object.assign(config, data);
        config.updatedBy = userId;
        return await this.repo.save(config);
    }

    // Xóa vĩnh viễn cấu hình AI
    async delete(id) {
        const config = await this.repo.findOne({ where: { id } });
        if (!config) throw new Error('Cấu hình không tồn tại.');
        
        // Thực hiện xóa cứng (Hard delete) khỏi cơ sở dữ liệu
        await this.repo.delete(id);
    }
}
