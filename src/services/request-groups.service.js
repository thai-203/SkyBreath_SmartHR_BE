import { RequestGroupsRepository } from '../repositories/request-groups.repository.js';
import { RequestGroupWorkflowsRepository } from '../repositories/request-group-workflows.repository.js';
import { RequestTypesRepository } from '../repositories/request-types.repository.js';
import { NotFoundException, ConflictException, BadRequestException } from '../common/exceptions/index.js';

export class RequestGroupsService {
    constructor() {
        this.repository = new RequestGroupsRepository();
        this.workflowRepo = new RequestGroupWorkflowsRepository();
        this.typesRepo = new RequestTypesRepository();
    }

    /**
     * @description Lấy danh sách nhóm đơn từ có phân trang và tìm kiếm (UC-REQ-GRP-05)
     * @param {Object} options Options phân trang và lọc (skip, take, search)
     * @returns {Object} Gồm items và tổng số (total)
     */
    async findAll(options) {
        return await this.repository.findAll(options);
    }

    /**
     * @description Lấy chi tiết một nhóm đơn từ (UC-REQ-GRP-04)
     * @param {number} id ID nhóm đơn
     * @returns {Object} Thông tin chi tiết nhóm đơn
     */
    async findById(id) {
        const group = await this.repository.findById(id);
        if (!group) {
            throw new NotFoundException('Không tìm thấy Nhóm Đơn Từ');
        }
        return group;
    }

    /**
     * @description Tạo mới một Nhóm đơn từ (UC-REQ-GRP-01)
     * @param {Object} createDto Dữ liệu tạo mới Nhóm đơn
     * @returns {Object} Nhóm đơn vừa tạo
     */
    async create(createDto) {
        const { workflows, ...groupData } = createDto;
        
        // Tạo nhóm đơn
        const newGroup = await this.repository.create(groupData);

        // Lưu cấu hình duyệt (Nếu có)
        if (workflows && workflows.length > 0) {
            // Validate thứ tự không trùng lặp (UC-REQ-GRP-07: BR-03)
            this._validateWorkflowLevels(workflows);
            
            const workflowData = workflows.map(wf => ({
                ...wf,
                requestGroupId: newGroup.id
            }));
            await this.workflowRepo.createMany(workflowData);
        }

        return await this.findById(newGroup.id);
    }

    /**
     * @description Cập nhật Nhóm đơn từ (UC-REQ-GRP-02) và luồng duyệt (UC-REQ-GRP-07)
     * @param {number} id ID Nhóm đơn cần cập nhật
     * @param {Object} updateDto Dữ liệu cần cập nhật
     * @returns {Object} Nhóm đơn sau cập nhật
     */
    async update(id, updateDto) {
        const group = await this.findById(id);

        const { workflows, ...groupData } = updateDto;

        // Cập nhật thông tin cơ bản
        if (Object.keys(groupData).length > 0) {
            await this.repository.update(id, groupData);
        }

        // Nếu có truyền workflows => tiến hành cập nhật lại luồng duyệt
        if (workflows !== undefined) {
            if (workflows.length > 0) {
                this._validateWorkflowLevels(workflows);
            }
            
            // Xoá luồng cũ
            await this.workflowRepo.deleteByGroupId(id);

            // Thêm luồng mới
            if (workflows.length > 0) {
                const workflowData = workflows.map(wf => ({
                    ...wf,
                    requestGroupId: id
                }));
                await this.workflowRepo.createMany(workflowData);
            }
        }

        return await this.findById(id);
    }

    /**
     * @description Xoá nhóm đơn từ (UC-REQ-GRP-03)
     * Nếu nhóm đơn đang chứa các Loại đơn thì chặn không cho xóa (BR-01)
     * @param {number} id ID Nhóm đơn cần xóa
     */
    async remove(id) {
        const group = await this.findById(id);

        // Kiểm tra xem nhóm có chứa loại đơn nào không (BR-01 của UC-REQ-GRP-03)
        const childCount = await this.typesRepo.countByGroupId(id);
        if (childCount > 0) {
            throw new ConflictException('Không thể xóa Nhóm Đơn Từ đang chứa Loại Đơn');
        }

        // Xóa các luồng duyệt
        await this.workflowRepo.deleteByGroupId(id);
        
        // Soft-delete nhóm đơn
        await this.repository.delete(id);
        return { message: 'Xoá nhóm đơn thành công' };
    }

    /**
     * @description Validate xem các cấp duyệt có bị trùng thứ tự không
     * @param {Array} workflows Danh sách cấp duyệt
     * @private
     */
    _validateWorkflowLevels(workflows) {
        const levels = workflows.map(wf => wf.levelOrder);
        const uniqueLevels = new Set(levels);
        if (levels.length !== uniqueLevels.size) {
            throw new BadRequestException('Thứ tự cấp duyệt (levelOrder) không được trùng lặp');
        }
    }
}
