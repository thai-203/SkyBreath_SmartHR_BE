import { NotFoundException, ConflictException, BadRequestException } from '../common/exceptions/index.js';
import { REVIEW_STATUS } from '../models/entities/performance-review.entity.js';

const SCORE_LIMITS = {
    scoreCompliance: 1.0,
    scoreAttitude: 1.0,
    scoreLearning: 1.0,
    scoreTeamwork: 1.0,
    scoreSkills: 1.0,
    scoreResult: 5.0,
};

const MAX_BEHAVIOR_SCORE = 5.0;

export class PerformanceReviewsService {
    constructor(performanceReviewsRepository) {
        this.performanceReviewsRepository = performanceReviewsRepository;
    }

    _isManager(userContext) {
        const roles = userContext?.roles || [];
        const upperRoles = roles.map(r => String(r).toUpperCase());
        return (
            upperRoles.includes('MANAGER') &&
            !upperRoles.includes('ADMIN') &&
            !upperRoles.includes('HR')
        );
    }

    calculateTotalScore(scores) {
        const behaviorScore = parseFloat(scores.scoreCompliance || 0) +
            parseFloat(scores.scoreAttitude || 0) +
            parseFloat(scores.scoreLearning || 0) +
            parseFloat(scores.scoreTeamwork || 0) +
            parseFloat(scores.scoreSkills || 0);

        const resultScore = parseFloat(scores.scoreResult || 0);

        return {
            behaviorScore: Math.round(behaviorScore * 100) / 100,
            resultScore: Math.round(resultScore * 100) / 100,
            totalScore: Math.round((behaviorScore + resultScore) * 100) / 100,
        };
    }

    validateScores(scores) {
        const errors = [];

        for (const [field, maxScore] of Object.entries(SCORE_LIMITS)) {
            const value = parseFloat(scores[field] || 0);
            if (value < 0) {
                errors.push(`${field} không được nhỏ hơn 0`);
            }
            if (value > maxScore) {
                errors.push(`${field} không được lớn hơn ${maxScore}`);
            }
        }

        const behaviorScore =
            parseFloat(scores.scoreCompliance || 0) +
            parseFloat(scores.scoreAttitude || 0) +
            parseFloat(scores.scoreLearning || 0) +
            parseFloat(scores.scoreTeamwork || 0) +
            parseFloat(scores.scoreSkills || 0);

        if (behaviorScore > MAX_BEHAVIOR_SCORE) {
            errors.push(`Tổng điểm 5 tiêu chí hành vi (1.1-1.5) không được vượt quá ${MAX_BEHAVIOR_SCORE}`);
        }

        return errors;
    }

    async findAll(queryDto, userContext) {
        const skip = (queryDto.page - 1) * queryDto.limit;
        const take = queryDto.limit;

        let departmentIds = null;
        if (userContext && this._isManager(userContext)) {
            const employeesRepoClass = (await import('../repositories/employees.repository.js')).EmployeesRepository;
            const employeesRepo = new employeesRepoClass();
            const managerEmployee = await employeesRepo.findByUserId(userContext.id);
            if (managerEmployee) {
                const { DepartmentEntity } = await import('../models/entities/department.entity.js');
                const { AppDataSource } = await import('../database/data-source.js');
                const deptRepo = AppDataSource.getRepository(DepartmentEntity);
                const managedDepts = await deptRepo.find({
                    where: { managerEmployeeId: managerEmployee.id },
                    select: ['id'],
                });
                departmentIds = managedDepts.map((d) => d.id);
            } else {
                departmentIds = [];
            }
        }

        const result = await this.performanceReviewsRepository.findAll({
            skip,
            take,
            search: queryDto.search,
            month: queryDto.month,
            year: queryDto.year,
            employeeId: queryDto.employeeId,
            managerId: queryDto.managerId,
            departmentIds,
        });
        return {
            data: result.items,
            total: result.total,
            page: queryDto.page,
            limit: queryDto.limit,
            totalPages: Math.ceil(result.total / queryDto.limit),
        };
    }

    async findById(id) {
        const review = await this.performanceReviewsRepository.findById(id);
        if (!review) {
            throw new NotFoundException('Không tìm thấy đánh giá');
        }
        return review;
    }

    async findByManager(managerId, month = null, year = null) {
        return this.performanceReviewsRepository.findByManagerId(
            managerId,
            month,
            year,
        );
    }

    async getManagedEmployees(managerId, userContext) {
        const employeesRepo = (await import('../repositories/employees.repository.js')).EmployeesRepository;
        const repo = new employeesRepo();
        const query = repo.repository
            .createQueryBuilder('employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .where('employee.isDeleted = :isDeleted', { isDeleted: false });

        if (userContext && this._isManager(userContext)) {
            const { DepartmentEntity } = await import('../models/entities/department.entity.js');
            const { AppDataSource } = await import('../database/data-source.js');
            const deptRepo = AppDataSource.getRepository(DepartmentEntity);
            const managedDepts = await deptRepo.find({
                where: { managerEmployeeId: managerId },
                select: ['id'],
            });
            const deptIds = managedDepts.map((d) => d.id);
            if (deptIds.length > 0) {
                query.andWhere('employee.departmentId IN (:...deptIds)', { deptIds });
            } else {
                query.andWhere('1 = 0');
            }
        } else {
            query.andWhere('employee.directManagerId = :managerId', { managerId });
        }

        return query.orderBy('employee.fullName', 'ASC').getMany();
    }

    async create(createDto, currentUser, userContext) {
        const { employeeId, reviewMonth, reviewYear } = createDto;

        if (userContext && this._isManager(userContext)) {
            const employeesRepoClass = (await import('../repositories/employees.repository.js')).EmployeesRepository;
            const employeesRepo = new employeesRepoClass();
            const targetEmployee = await employeesRepo.findById(employeeId);
            if (!targetEmployee) {
                throw new NotFoundException('Không tìm thấy nhân viên được đánh giá');
            }

            const { DepartmentEntity } = await import('../models/entities/department.entity.js');
            const { AppDataSource } = await import('../database/data-source.js');
            const deptRepo = AppDataSource.getRepository(DepartmentEntity);
            const managedDepts = await deptRepo.find({
                where: { managerEmployeeId: currentUser.employeeId },
                select: ['id'],
            });
            const deptIds = managedDepts.map((d) => d.id);
            if (!deptIds.includes(targetEmployee.departmentId)) {
                throw new BadRequestException('Bạn chỉ có quyền đánh giá nhân viên thuộc phòng ban mình quản lý.');
            }
        }

        const existing = await this.performanceReviewsRepository.findByEmployeeAndPeriod(
            employeeId,
            reviewMonth,
            reviewYear,
        );

        if (existing) {
            throw new ConflictException(
                `Nhân viên đã được đánh giá trong tháng ${reviewMonth}/${reviewYear}`,
            );
        }

        const scoreValidation = this.validateScores(createDto);
        if (scoreValidation.length > 0) {
            throw new ConflictException(scoreValidation.join('; '));
        }

        const scores = this.calculateTotalScore(createDto);

        const reviewData = {
            ...createDto,
            managerId: currentUser.employeeId,
            totalScore: scores.totalScore,
            status: createDto.status || REVIEW_STATUS.SUBMITTED,
        };

        return this.performanceReviewsRepository.create(reviewData);
    }

    async update(id, updateDto, userContext) {
        const existing = await this.findById(id);

        if (userContext && this._isManager(userContext)) {
            const employeesRepoClass = (await import('../repositories/employees.repository.js')).EmployeesRepository;
            const employeesRepo = new employeesRepoClass();
            const managerEmployee = await employeesRepo.findByUserId(userContext.id);
            if (!managerEmployee) {
                throw new BadRequestException('Không tìm thấy nhân viên quản lý.');
            }

            const targetEmployee = await employeesRepo.findById(existing.employeeId);
            if (!targetEmployee) {
                throw new NotFoundException('Không tìm thấy nhân viên được đánh giá');
            }

            const { DepartmentEntity } = await import('../models/entities/department.entity.js');
            const { AppDataSource } = await import('../database/data-source.js');
            const deptRepo = AppDataSource.getRepository(DepartmentEntity);
            const managedDepts = await deptRepo.find({
                where: { managerEmployeeId: managerEmployee.id },
                select: ['id'],
            });
            const deptIds = managedDepts.map((d) => d.id);
            if (!deptIds.includes(targetEmployee.departmentId)) {
                throw new BadRequestException('Bạn chỉ có quyền chỉnh sửa đánh giá của nhân viên thuộc phòng ban mình quản lý.');
            }
        }

        const mergedScores = {
            scoreCompliance: updateDto.scoreCompliance ?? existing.scoreCompliance,
            scoreAttitude: updateDto.scoreAttitude ?? existing.scoreAttitude,
            scoreLearning: updateDto.scoreLearning ?? existing.scoreLearning,
            scoreTeamwork: updateDto.scoreTeamwork ?? existing.scoreTeamwork,
            scoreSkills: updateDto.scoreSkills ?? existing.scoreSkills,
            scoreResult: updateDto.scoreResult ?? existing.scoreResult,
        };

        if (updateDto.reviewMonth !== undefined || updateDto.reviewYear !== undefined || updateDto.employeeId !== undefined) {
            const employeeId = updateDto.employeeId ?? existing.employeeId;
            const month = updateDto.reviewMonth ?? existing.reviewMonth;
            const year = updateDto.reviewYear ?? existing.reviewYear;

            const duplicate = await this.performanceReviewsRepository.findByEmployeeAndPeriod(
                employeeId,
                month,
                year,
                id,
            );

            if (duplicate) {
                throw new ConflictException(
                    `Nhân viên đã được đánh giá trong tháng ${month}/${year}`,
                );
            }
        }

        const scoreValidation = this.validateScores(mergedScores);
        if (scoreValidation.length > 0) {
            throw new ConflictException(scoreValidation.join('; '));
        }

        const scores = this.calculateTotalScore(mergedScores);

        const updateData = {
            ...updateDto,
            totalScore: scores.totalScore,
        };

        return this.performanceReviewsRepository.update(id, updateData);
    }

    async delete(id, userContext) {
        const existing = await this.findById(id);

        if (userContext && this._isManager(userContext)) {
            const employeesRepoClass = (await import('../repositories/employees.repository.js')).EmployeesRepository;
            const employeesRepo = new employeesRepoClass();
            const managerEmployee = await employeesRepo.findByUserId(userContext.id);
            if (!managerEmployee) {
                throw new BadRequestException('Không tìm thấy nhân viên quản lý.');
            }

            const targetEmployee = await employeesRepo.findById(existing.employeeId);
            if (!targetEmployee) {
                throw new NotFoundException('Không tìm thấy nhân viên được đánh giá');
            }

            const { DepartmentEntity } = await import('../models/entities/department.entity.js');
            const { AppDataSource } = await import('../database/data-source.js');
            const deptRepo = AppDataSource.getRepository(DepartmentEntity);
            const managedDepts = await deptRepo.find({
                where: { managerEmployeeId: managerEmployee.id },
                select: ['id'],
            });
            const deptIds = managedDepts.map((d) => d.id);
            if (!deptIds.includes(targetEmployee.departmentId)) {
                throw new BadRequestException('Bạn chỉ có quyền xóa đánh giá của nhân viên thuộc phòng ban mình quản lý.');
            }
        }

        return this.performanceReviewsRepository.softDelete(id);
    }
}
