import { RequestTypesRepository } from '../repositories/request-types.repository.js';
import { RequestTypePoliciesRepository } from '../repositories/request-type-policies.repository.js';
import { RequestGroupsRepository } from '../repositories/request-groups.repository.js';
import { NotFoundException, BadRequestException, ConflictException } from '../common/exceptions/index.js';
import { PaginatedResponseDto } from '../common/dto/pagination.dto.js';

export class RequestTypesService {
    constructor() {
        this.repository = new RequestTypesRepository();
        this.policyRepo = new RequestTypePoliciesRepository();
        this.groupsRepo = new RequestGroupsRepository();
    }

    /**
     * @description Lấy danh sách Loại Đơn có phân trang
     * @param {Object} paginationDto DTO chứa thông tin phân trang
     */
    async findAll(paginationDto) {
        const { items, total } = await this.repository.findAll({
            ...paginationDto,
            includeDeleted: true, // Trẻ về cả loại đơn xóa mềm
        });
        return new PaginatedResponseDto(items, total, paginationDto);
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

        // Check duplicate name trong cùng group (kể cả xóa mềm)
        const existingType = await this.repository.findByNameAndGroupWithDeleted(typeData.name, requestGroupId);
        if (existingType) {
            throw new ConflictException('Tên loại đơn từ này đã tồn tại trong nhóm.');
        }

        // Tạo loại đơn
        const newType = await this.repository.create({ ...typeData, requestGroupId });

        // Tạo policy nếu có gửi kèm
        if (policy) {
            if (policy.isUnlimited) {
                policy.maxQuantity = 0;
            }
            delete policy.isUnlimited;
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
            // Nếu đang kích hoạt lại (status -> ACTIVE), kiểm tra nhóm cha
            if (typeData.status === 'ACTIVE') {
                const parentGroupId = typeData.requestGroupId || typeItem.requestGroupId;
                const parentGroup = await this.groupsRepo.findById(parentGroupId);
                if (!parentGroup || parentGroup.isDeleted) {
                    throw new BadRequestException('Không thể kích hoạt loại đơn vì Nhóm Đơn cha đã bị xoá.');
                }
                if (parentGroup.status !== 'ACTIVE') {
                    throw new BadRequestException('Không thể kích hoạt loại đơn vì Nhóm Đơn cha đang ở trạng thái không hoạt động.');
                }
            }

            // Check duplicate name nếu thay đổi tên hoặc di chuyển sang group khác
            const nameToCheck = typeData.name || typeItem.name;
            const groupToCheck = typeData.requestGroupId || typeItem.requestGroupId;
            
            const existingType = await this.repository.findByNameAndGroupWithDeleted(nameToCheck, groupToCheck);
            if (existingType && existingType.id !== id) {
                throw new ConflictException('Tên loại đơn từ này đã tồn tại trong nhóm nguồn/đích, kể cả trong thùng rác.');
            }

            await this.repository.update(id, typeData);
        }

        // Cập nhật Policy
        if (policy !== undefined) {
            if (policy === null) {
                // Remove policy
                await this.policyRepo.deleteByTypeId(id);
            } else {
                if (policy.isUnlimited) {
                    policy.maxQuantity = 0;
                }
                delete policy.isUnlimited;
                await this.policyRepo.upsert(id, policy);
            }
        }

        return await this.findById(id);
    }

    /**
     * @description Cập nhật Policy của Loại Đơn (UC-REQ-TYPE-07)
     * @param {number} id ID loại đơn
     * @param {Object} policyData Dữ liệu policy cần cập nhật
     */
    async updatePolicy(id, policyData) {
        // Kiểm tra loại đơn có tồn tại không
        await this.findById(id);

        if (policyData.isUnlimited) {
            policyData.maxQuantity = 0;
        }
        delete policyData.isUnlimited;

        // Upsert policy
        await this.policyRepo.upsert(id, policyData);

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

    /**
     * @description Khôi phục Loại Đơn đã xoá mềm
     * @param {number} id ID loại đơn cần khôi phục
     */
    async restore(id) {
        const typeItem = await this.repository.findByIdWithDeleted(id);
        if (!typeItem) {
            throw new NotFoundException('Không tìm thấy Loại Đơn Từ');
        }
        if (!typeItem.isDeleted) {
            throw new BadRequestException('Loại đơn từ này chưa bị xoá');
        }

        // Kiểm tra nhóm đơn cha có còn tồn tại và chưa bị xoá không
        const parentGroup = await this.groupsRepo.findById(typeItem.requestGroupId);
        if (!parentGroup || parentGroup.isDeleted) {
            throw new BadRequestException('Không thể khôi phục vì Nhóm Đơn cha đã bị xoá. Vui lòng khôi phục Nhóm Đơn trước.');
        }

        await this.repository.update(id, {
            isDeleted: false,
            deletedAt: null,
            status: 'INACTIVE',
        });

        return { message: 'Khôi phục loại đơn thành công' };
    }
}
