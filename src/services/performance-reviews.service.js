import { NotFoundException, ConflictException } from '../common/exceptions/index.js';
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

    async findAll(queryDto) {
        const skip = (queryDto.page - 1) * queryDto.limit;
        const take = queryDto.limit;

        const result = await this.performanceReviewsRepository.findAll({
            skip,
            take,
            search: queryDto.search,
            month: queryDto.month,
            year: queryDto.year,
            employeeId: queryDto.employeeId,
            managerId: queryDto.managerId,
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

    async getManagedEmployees(managerId) {
        const employeesRepo = (await import('../repositories/employees.repository.js')).EmployeesRepository;
        const repo = new employeesRepo();
        const query = repo.repository
            .createQueryBuilder('employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .where('employee.directManagerId = :managerId', { managerId })
            .andWhere('employee.isDeleted = :isDeleted', { isDeleted: false });

        return query.orderBy('employee.fullName', 'ASC').getMany();
    }

    async create(createDto, currentUser) {
        const { employeeId, reviewMonth, reviewYear } = createDto;

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

    async update(id, updateDto) {
        const existing = await this.findById(id);

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

    async delete(id) {
        const existing = await this.findById(id);
        return this.performanceReviewsRepository.softDelete(id);
    }
}
