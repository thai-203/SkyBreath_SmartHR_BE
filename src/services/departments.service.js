import { DepartmentsRepository } from '../repositories/departments.repository.js';
import { NotFoundException, ConflictException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';

export class DepartmentsService {
    constructor() {
        this.departmentsRepository = new DepartmentsRepository();
    }

    // Tạo phòng ban mới. (Nhận dữ liệu từ body, validate, gọi repository để tạo và trả về kết quả)
    async create(createDto) {
        const existing = await this.departmentsRepository.findByName(createDto.departmentName);
        if (existing) {
            throw new ConflictException(AppMessages.Errors.Department.ALREADY_EXISTS);
        }
        return this.departmentsRepository.create(createDto);
    }

    // Lấy danh sách phòng ban có phân trang, lọc và tìm kiếm. (Nhận các tham số query, gọi repository để lấy dữ liệu và trả về kết quả.)
    async findAll(queryDto) {
        const [departments, total] = await this.departmentsRepository.findAll(queryDto);
        return new PaginatedResponseDto(departments, total, queryDto);
    }

    //  Lấy chi tiết phòng ban theo ID. (Nhận ID từ params, gọi repository để lấy dữ liệu và trả về kết quả.)
    async findById(id) {
        const department = await this.departmentsRepository.findById(id);
        if (!department) {
            throw new NotFoundException(AppMessages.Errors.Department.NOT_FOUND);
        }
        return department;
    }

    //  Cập nhật thông tin phòng ban. (Nhận ID từ params và dữ liệu cập nhật từ body, validate, gọi repository để cập nhật và trả về kết quả.)
    async update(id, updateDto) {
        await this.findById(id);

        if (updateDto.departmentName) {
            const existing = await this.departmentsRepository.findByName(updateDto.departmentName);
            if (existing && existing.id !== id) {
                throw new ConflictException(AppMessages.Errors.Department.ALREADY_EXISTS);
            }
        }

        return this.departmentsRepository.update(id, updateDto);
    }

    //    Xóa phòng ban. (Nhận ID từ params, kiểm tra nếu có phòng ban con hoặc nhân viên nào đang thuộc phòng ban này thì không cho xóa, nếu không thì gọi repository để xóa và trả về kết quả.)
    async remove(id) {
        await this.findById(id);

        const hasChildren = await this.departmentsRepository.hasChildren(id);
        if (hasChildren) {
            throw new ConflictException(AppMessages.Errors.Department.HAS_CHILDREN);
        }

        const hasEmployees = await this.departmentsRepository.hasEmployees(id);
        if (hasEmployees) {
            throw new ConflictException(AppMessages.Errors.Department.HAS_EMPLOYEES);
        }

        await this.departmentsRepository.delete(id);
    }

    // Lấy sơ đồ tổ chức phòng ban dưới dạng cây phân cấp. (Gọi repository để lấy tất cả phòng ban, sau đó xây dựng cấu trúc cây dựa trên parentDepartmentId và trả về kết quả.)
    async getOrgChart() {
        const departments = await this.departmentsRepository.findWithChildren();
        return this.buildTree(departments);
    }


    // Xuất danh sách phòng ban ra file CSV. (Gọi repository để lấy tất cả phòng ban, sau đó sử dụng thư viện ExcelUtil để tạo file Excel và trả về kết quả.)
    async exportExcel() {
        const [departments] = await this.departmentsRepository.findAll({ limit: 10000, page: 1 });

        const data = departments.map((d, index) => ({
            index: index + 1,
            name: d.departmentName,
            parent: d.parentDepartment?.departmentName || '',
            manager: d.manager?.fullName || '',
        }));

        const columns = [
            { header: 'STT', key: 'index', width: 10 },
            { header: 'Tên phòng ban', key: 'name', width: 30 },
            { header: 'Phòng ban cha', key: 'parent', width: 30 },
            { header: 'Quản lý', key: 'manager', width: 30 },
        ];

        return ExcelUtil.export(data, columns, 'Danh sách phòng ban');
    }

    // Lấy danh sách phòng ban (không phân trang, không lọc) để dùng trong dropdown chọn phòng ban cha hoặc quản lý. (Gọi repository để lấy tất cả phòng ban và trả về kết quả.)
    async findList() {
        return this.departmentsRepository.findList();
    }

    buildTree(departments, parentId = null) {
        return departments
            .filter(d => d.parentDepartmentId === parentId)
            .map(d => ({
                ...d,
                children: this.buildTree(departments, d.id),
            }));
    }
}
