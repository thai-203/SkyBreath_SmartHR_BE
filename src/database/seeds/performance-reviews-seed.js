/**
 * Seed KPI performance review records for employees with direct managers.
 * Months: Feb, Mar, May 2026 (skip April).
 * Run: npx babel-node src/database/seeds/performance-reviews-seed.js
 */

import { AppDataSource } from '../data-source.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import { PerformanceReviewEntity, REVIEW_STATUS } from '../../models/entities/performance-review.entity.js';

const REVIEW_MONTHS = [2, 3, 5];
const REVIEW_YEAR = 2026;

const buildScores = (employeeId, month) => {
    const mod2 = employeeId % 2;
    const mod3 = employeeId % 3;
    const mod5 = employeeId % 5;

    const scoreCompliance = Math.min(1, 0.74 + mod3 * 0.07 + month * 0.004);
    const scoreAttitude = Math.min(1, 0.76 + mod5 * 0.03 + (month === 5 ? 0.05 : 0));
    const scoreLearning = Math.min(1, 0.70 + mod2 * 0.08 + (month === 3 ? 0.03 : 0));
    const scoreTeamwork = Math.min(1, 0.78 + mod5 * 0.02);
    const scoreSkills = Math.min(1, 0.72 + mod3 * 0.05);
    const scoreResult = Math.min(5, 3.8 + (month === 5 ? 0.5 : month === 3 ? 0.35 : 0.25) + mod2 * 0.08 + mod5 * 0.02);

    return {
        scoreCompliance: Number(scoreCompliance.toFixed(2)),
        scoreAttitude: Number(scoreAttitude.toFixed(2)),
        scoreLearning: Number(scoreLearning.toFixed(2)),
        scoreTeamwork: Number(scoreTeamwork.toFixed(2)),
        scoreSkills: Number(scoreSkills.toFixed(2)),
        scoreResult: Number(scoreResult.toFixed(2)),
    };
};

const calculateTotalScore = (scores) => {
    const behaviorScore =
        scores.scoreCompliance +
        scores.scoreAttitude +
        scores.scoreLearning +
        scores.scoreTeamwork +
        scores.scoreSkills;
    return Number((behaviorScore + scores.scoreResult).toFixed(2));
};

const seedPerformanceReviews = async () => {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        const reviewRepo = AppDataSource.getRepository(PerformanceReviewEntity);

        const employees = await employeeRepo
            .createQueryBuilder('employee')
            .leftJoinAndSelect('employee.directManager', 'directManager')
            .where('employee.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('employee.directManagerId IS NOT NULL')
            .orderBy('employee.id', 'ASC')
            .getMany();

        if (!employees.length) {
            console.log('No employees with direct managers found. Nothing to seed.');
            process.exit(0);
        }

        let inserted = 0;
        let updated = 0;

        for (const employee of employees) {
            for (const reviewMonth of REVIEW_MONTHS) {
                const scores = buildScores(employee.id, reviewMonth);
                const totalScore = calculateTotalScore(scores);
                const reviewData = {
                    employeeId: employee.id,
                    managerId: employee.directManagerId,
                    reviewMonth,
                    reviewYear: REVIEW_YEAR,
                    totalScore,
                    managerComment: `Seed KPI tự động ${reviewMonth}/${REVIEW_YEAR}`,
                    status: REVIEW_STATUS.SUBMITTED,
                    ...scores,
                };

                const existing = await reviewRepo.findOne({
                    where: {
                        employeeId: employee.id,
                        reviewMonth,
                        reviewYear: REVIEW_YEAR,
                        isDeleted: false,
                    },
                });

                if (existing) {
                    Object.assign(existing, reviewData);
                    await reviewRepo.save(existing);
                    updated += 1;
                } else {
                    await reviewRepo.save(reviewRepo.create(reviewData));
                    inserted += 1;
                }
            }
        }

        console.log(`✅ Performance review seed completed. Inserted=${inserted}, Updated=${updated}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
};

seedPerformanceReviews();
