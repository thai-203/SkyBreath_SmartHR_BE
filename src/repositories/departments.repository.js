import { AppDataSource } from '../database/data-source.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { Like } from 'typeorm';

export class DepartmentsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(DepartmentEntity);
    }

    // Tạo phòng ban mới. (Nhận dữ liệu từ body, validate, gọi repository để tạo và trả về kết quả)
    async create(data) {
        const department = this.repository.create(data);
        return this.repository.save(department);
    }

    //  Lấy danh sách phòng ban có phân trang, lọc và tìm kiếm. (Nhận các tham số query, gọi repository để lấy dữ liệu và trả về kết quả.)
    async findAll(queryDto) {
        const { skip, limit, sortBy, sortOrder, search, parentDepartmentId, managerEmployeeId, hasEmployees } = queryDto;

        const query = this.repository.createQueryBuilder('department')
            .leftJoinAndSelect('department.parentDepartment', 'parentDepartment')
            .leftJoinAndSelect('department.manager', 'manager')
            .where('department.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            query.andWhere('department.departmentName LIKE :search', { search: `%${search}%` });
        }

        if (parentDepartmentId) {
            query.andWhere('department.parentDepartmentId = :parentDepartmentId', { parentDepartmentId });
        }

        if (managerEmployeeId) {
            query.andWhere('department.managerEmployeeId = :managerEmployeeId', { managerEmployeeId });
        }

        if (hasEmployees === 'true' || hasEmployees === 'false') {
            const hasEmp = hasEmployees === 'true';
            const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
            const subQuery = employeeRepo.createQueryBuilder('employee')
                .select('employee.departmentId')
                .where('employee.isDeleted = :isDeleted', { isDeleted: false })
                .groupBy('employee.departmentId');

            if (hasEmp) {
                query.andWhere(`department.id IN (${subQuery.getQuery()})`)
                    .setParameters(subQuery.getParameters());
            } else {
                query.andWhere(`department.id NOT IN (${subQuery.getQuery()})`)
                    .setParameters(subQuery.getParameters());
            }
        }

        if (sortBy) {
            query.orderBy(`department.${sortBy}`, sortOrder || 'DESC');
        } else {
            query.orderBy('department.createdAt', 'DESC');
        }

        const [items, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        // Add employee count to each item
        const employeeRepository = AppDataSource.getRepository(EmployeeEntity);
        const itemsWithCount = await Promise.all(items.map(async (item) => {
            const employeeCount = await employeeRepository.count({
                where: { departmentId: item.id, isDeleted: false }
            });
            return { ...item, employeeCount };
        }));

        return [itemsWithCount, total];
    }

    //  Lấy chi tiết phòng ban theo ID. (Nhận ID từ params, gọi repository để lấy dữ liệu và trả về kết quả.)
    async findById(id) {
        const department = await this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['parentDepartment', 'manager'],
        });

        if (department) {
            const employeeRepository = AppDataSource.getRepository(EmployeeEntity);
            department.employeeCount = await employeeRepository.count({
                where: { departmentId: department.id, isDeleted: false }
            });

            // Get children
            department.children = await this.repository.find({
                where: { parentDepartmentId: department.id, isDeleted: false },
                relations: ['manager']
            });
        }

        return department;
    }

    //  Cập nhật thông tin phòng ban. (Nhận ID từ params và dữ liệu cập nhật từ body, validate, gọi repository để cập nhật và trả về kết quả.)
    async update(id, data) {
        await this.repository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Department not found');
        }
        return updated;
    }

    //  Xóa phòng ban. (Nhận ID từ params, kiểm tra nếu có phòng ban con hoặc nhân viên nào đang thuộc phòng ban này thì không cho xóa, nếu không thì gọi repository để xóa và trả về kết quả.)
    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }

    //  Lấy sơ đồ tổ chức phòng ban dưới dạng cây phân cấp. (Gọi repository để lấy tất cả phòng ban, sau đó xây dựng cấu trúc cây dựa trên parentDepartmentId và trả về kết quả.)
    async findWithChildren() {
        return this.repository.find({
            where: { isDeleted: false },
            relations: ['parentDepartment', 'manager'],
        });
    }

    // Xuất danh sách phòng ban ra file CSV. (Gọi repository để lấy tất cả phòng ban, sau đó sử dụng thư viện ExcelUtil để tạo file Excel và trả về kết quả.)
    async findList() {
        return this.repository.find({
            where: { isDeleted: false },
            select: ['id', 'departmentName'],
            order: { departmentName: 'ASC' },
        });
    }

    // Tìm phòng ban theo tên. (Nhận tên phòng ban, gọi repository để tìm kiếm và trả về kết quả.)
    async findByName(name) {
        return this.repository.findOne({
            where: { departmentName: name, isDeleted: false },
        });
    }

    //  Kiểm tra nếu có phòng ban con hoặc nhân viên nào đang thuộc phòng ban này thì không cho xóa. (Nhận ID của phòng ban, gọi repository để kiểm tra và trả về kết quả.)
    async hasChildren(id) {
        const count = await this.repository.count({
            where: { parentDepartmentId: id, isDeleted: false }
        });
        return count > 0;
    }

    // Kiểm tra nếu có nhân viên nào đang thuộc phòng ban này thì không cho xóa. (Nhận ID của phòng ban, gọi repository để kiểm tra và trả về kết quả.)
    async hasEmployees(id) {
        const employeeRepository = AppDataSource.getRepository(EmployeeEntity);
        const count = await employeeRepository.count({
            where: { departmentId: id, isDeleted: false }
        });
        return count > 0;
    }
}
