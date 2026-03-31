import { RequestTypesRepository } from '../repositories/request-types.repository.js';
import { RequestTypePoliciesRepository } from '../repositories/request-type-policies.repository.js';
import { RequestGroupsRepository } from '../repositories/request-groups.repository.js';
import { NotFoundException, BadRequestException, ConflictException } from '../common/exceptions/index.js';

export class RequestTypesService {
    constructor() {
        this.repository = new RequestTypesRepository();
        this.policyRepo = new RequestTypePoliciesRepository();
        this.groupsRepo = new RequestGroupsRepository();
    }

    /**
     * @description Lấy danh sách Loại Đơn (UC-REQ-TYPE-05) với filter tuỳ chỉ định
     * @param {Object} options Options phân trang và lọc (Ví dụ group id)
     */
    async findAll(options) {
        return await this.repository.findAll(options);
    }

    /**
     * @description Lấy chi tiết Loại Đơn kèm theo Policy (UC-REQ-TYPE-04)
     * @param {number} id Id của Loại đơn
     */
    async findById(id) {
        const type = await this.repository.findById(id);
        if (!type) {
            throw new NotFoundException('Không tìm thấy Loại Đơn Từ');
        }
        return type;
    }

    /**
     * @description Tạo mới Loại Đơn Từ kèm Policy (UC-REQ-TYPE-01 & UC-REQ-TYPE-07)
     * @param {Object} createDto Thông tin loại đơn và policy
     */
    async create(createDto) {
        const { policy, requestGroupId, ...typeData } = createDto;

        // Check nhóm cha có tồn tại không
        const group = await this.groupsRepo.findById(requestGroupId);
        if (!group) throw new NotFoundException('Không tìm thấy Nhóm Đơn Từ cha');

        // Tạo loại đơn
        const newType = await this.repository.create({ ...typeData, requestGroupId });

        // Tạo policy nêys có gửi kèm
        if (policy) {
            await this.policyRepo.upsert(newType.id, policy);
        }

        return await this.findById(newType.id);
    }

    /**
     * @description Cập nhật Loại Đơn và Policy (UC-REQ-TYPE-02)
     * @param {number} id ID loại đơn cần sửa
     * @param {Object} updateDto Data sửa
     */
    async update(id, updateDto) {
        const typeItem = await this.findById(id);
        const { policy, requestGroupId, ...typeData } = updateDto;

        // Nếu thay đổi group Id, cần check group mới
        if (requestGroupId && requestGroupId !== typeItem.requestGroupId) {
            const group = await this.groupsRepo.findById(requestGroupId);
            if (!group) throw new NotFoundException('Không tìm thấy Nhóm Đơn Từ cha mục tiêu');
            typeData.requestGroupId = requestGroupId;
        }

        // Cập nhật thông tin cơ bản
        if (Object.keys(typeData).length > 0) {
            await this.repository.update(id, typeData);
        }

        // Cập nhật Policy
        if (policy !== undefined) {
            if (policy === null) {
                // Remove policy
                await this.policyRepo.deleteByTypeId(id);
            } else {
                await this.policyRepo.upsert(id, policy);
            }
        }

        return await this.findById(id);
    }

    /**
     * @description Xóa loại đơn (UC-REQ-TYPE-03)
     * @param {number} id ID cần xóa
     */
    async remove(id) {
        const typeItem = await this.findById(id);

        // Xóa policy đi kèm
        await this.policyRepo.deleteByTypeId(id);
        
        // Soft delete type
        await this.repository.delete(id);
        
        return { message: 'Xoá loại đơn thành công' };
    }
}
