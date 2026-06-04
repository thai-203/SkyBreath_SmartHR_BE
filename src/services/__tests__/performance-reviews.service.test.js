import 'reflect-metadata';
import { PerformanceReviewsService } from '../performance-reviews.service.js';
import { PerformanceReviewsRepository } from '../../repositories/performance-reviews.repository.js';
import { AppDataSource } from '../../database/data-source.js';
import { BadRequestException, NotFoundException } from '../../common/exceptions/index.js';

const mockEmployeesRepo = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    repository: {
        createQueryBuilder: jest.fn(),
    },
};

jest.mock('../../repositories/employees.repository.js', () => ({
    EmployeesRepository: jest.fn().mockImplementation(() => mockEmployeesRepo),
}));

jest.mock('../../repositories/performance-reviews.repository.js', () => ({
    PerformanceReviewsRepository: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));

describe('PerformanceReviewsService - Department Authorization Tests', () => {
    let service;
    let reviewsRepo;
    let deptRepo;

    beforeEach(() => {
        jest.clearAllMocks();

        reviewsRepo = {
            findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
            findById: jest.fn(),
            findByEmployeeAndPeriod: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
        };

        deptRepo = {
            find: jest.fn().mockResolvedValue([]),
        };

        PerformanceReviewsRepository.mockImplementation(() => reviewsRepo);
        AppDataSource.getRepository.mockImplementation((entity) => {
            const name = entity?.name;
            if (name === 'DepartmentEntity') {
                return deptRepo;
            }
            if (name === 'EmployeeEntity') {
                return {
                    findOne: jest.fn(),
                };
            }
            return {};
        });

        service = new PerformanceReviewsService(reviewsRepo);
    });

    describe('findAll', () => {
        it('should list all reviews without department restrictions for ADMIN/HR roles', async () => {
            const queryDto = { page: 1, limit: 10 };
            const userContext = { id: 1, roles: ['HR'] };

            await service.findAll(queryDto, userContext);

            expect(reviewsRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ departmentIds: null })
            );
        });

        it('should list reviews filtered by managed departments for MANAGER role', async () => {
            const queryDto = { page: 1, limit: 10 };
            const userContext = { id: 2, roles: ['MANAGER'] };

            mockEmployeesRepo.findByUserId.mockResolvedValue({ id: 20 });
            deptRepo.find.mockResolvedValue([{ id: 3 }, { id: 4 }]);

            await service.findAll(queryDto, userContext);

            expect(mockEmployeesRepo.findByUserId).toHaveBeenCalledWith(2);
            expect(deptRepo.find).toHaveBeenCalledWith({
                where: { managerEmployeeId: 20 },
                select: ['id'],
            });
            expect(reviewsRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ departmentIds: [3, 4] })
            );
        });

        it('should return empty list if MANAGER does not manage any department', async () => {
            const queryDto = { page: 1, limit: 10 };
            const userContext = { id: 2, roles: ['MANAGER'] };

            mockEmployeesRepo.findByUserId.mockResolvedValue({ id: 20 });
            deptRepo.find.mockResolvedValue([]); // No managed depts

            await service.findAll(queryDto, userContext);

            expect(reviewsRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ departmentIds: [] })
            );
        });
    });

    describe('getManagedEmployees', () => {
        let employeeRepoMock;

        beforeEach(() => {
            employeeRepoMock = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockEmployeesRepo.repository.createQueryBuilder = jest.fn().mockReturnValue(employeeRepoMock);
        });

        it('should filter by directManagerId for ADMIN/HR', async () => {
            const userContext = { id: 1, roles: ['ADMIN'] };

            await service.getManagedEmployees(10, userContext);

            expect(mockEmployeesRepo.repository.createQueryBuilder).toHaveBeenCalled();
            expect(employeeRepoMock.where).toHaveBeenCalledWith(
                'employee.isDeleted = :isDeleted',
                { isDeleted: false }
            );
            expect(employeeRepoMock.andWhere).toHaveBeenCalledWith(
                'employee.directManagerId = :managerId',
                { managerId: 10 }
            );
        });

        it('should filter by managed departments for MANAGER', async () => {
            const userContext = { id: 2, roles: ['MANAGER'] };
            deptRepo.find.mockResolvedValue([{ id: 3 }]);

            await service.getManagedEmployees(10, userContext);

            expect(deptRepo.find).toHaveBeenCalledWith({
                where: { managerEmployeeId: 10 },
                select: ['id'],
            });
            expect(employeeRepoMock.andWhere).toHaveBeenCalledWith(
                'employee.departmentId IN (:...deptIds)',
                { deptIds: [3] }
            );
        });
    });

    describe('create', () => {
        it('should allow create if employee is in managed departments for MANAGER', async () => {
            const createDto = { employeeId: 100, reviewMonth: 6, reviewYear: 2026 };
            const currentUser = { employeeId: 20 };
            const userContext = { id: 2, roles: ['MANAGER'] };

            mockEmployeesRepo.findById.mockResolvedValue({ id: 100, departmentId: 3 });
            deptRepo.find.mockResolvedValue([{ id: 3 }]);
            reviewsRepo.findByEmployeeAndPeriod.mockResolvedValue(null);
            reviewsRepo.create.mockResolvedValue({ id: 5 });

            const result = await service.create(createDto, currentUser, userContext);
            expect(result).toBeDefined();
            expect(reviewsRepo.create).toHaveBeenCalled();
        });

        it('should throw BadRequestException if employee is NOT in managed departments for MANAGER', async () => {
            const createDto = { employeeId: 100, reviewMonth: 6, reviewYear: 2026 };
            const currentUser = { employeeId: 20 };
            const userContext = { id: 2, roles: ['MANAGER'] };

            mockEmployeesRepo.findById.mockResolvedValue({ id: 100, departmentId: 4 }); // belongs to dept 4
            deptRepo.find.mockResolvedValue([{ id: 3 }]); // manager only manages dept 3

            await expect(service.create(createDto, currentUser, userContext)).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('update', () => {
        it('should allow update if employee is in managed departments for MANAGER', async () => {
            const updateDto = { reviewMonth: 6, reviewYear: 2026 };
            const userContext = { id: 2, roles: ['MANAGER'] };

            reviewsRepo.findById.mockResolvedValue({ id: 1, employeeId: 100 });
            mockEmployeesRepo.findByUserId.mockResolvedValue({ id: 20 });
            mockEmployeesRepo.findById.mockResolvedValue({ id: 100, departmentId: 3 });
            deptRepo.find.mockResolvedValue([{ id: 3 }]);
            reviewsRepo.update.mockResolvedValue({ id: 1 });

            const result = await service.update(1, updateDto, userContext);
            expect(result).toBeDefined();
            expect(reviewsRepo.update).toHaveBeenCalled();
        });

        it('should throw BadRequestException if employee is NOT in managed departments for MANAGER', async () => {
            const updateDto = { reviewMonth: 6, reviewYear: 2026 };
            const userContext = { id: 2, roles: ['MANAGER'] };

            reviewsRepo.findById.mockResolvedValue({ id: 1, employeeId: 100 });
            mockEmployeesRepo.findByUserId.mockResolvedValue({ id: 20 });
            mockEmployeesRepo.findById.mockResolvedValue({ id: 100, departmentId: 4 }); // Dept 4
            deptRepo.find.mockResolvedValue([{ id: 3 }]); // Only manages Dept 3

            await expect(service.update(1, updateDto, userContext)).rejects.toThrow(
                BadRequestException
            );
        });
    });

    describe('delete', () => {
        it('should allow delete if employee is in managed departments for MANAGER', async () => {
            const userContext = { id: 2, roles: ['MANAGER'] };

            reviewsRepo.findById.mockResolvedValue({ id: 1, employeeId: 100 });
            mockEmployeesRepo.findByUserId.mockResolvedValue({ id: 20 });
            mockEmployeesRepo.findById.mockResolvedValue({ id: 100, departmentId: 3 });
            deptRepo.find.mockResolvedValue([{ id: 3 }]);
            reviewsRepo.softDelete.mockResolvedValue({ affected: 1 });

            const result = await service.delete(1, userContext);
            expect(result).toBeDefined();
            expect(reviewsRepo.softDelete).toHaveBeenCalledWith(1);
        });

        it('should throw BadRequestException if employee is NOT in managed departments for MANAGER', async () => {
            const userContext = { id: 2, roles: ['MANAGER'] };

            reviewsRepo.findById.mockResolvedValue({ id: 1, employeeId: 100 });
            mockEmployeesRepo.findByUserId.mockResolvedValue({ id: 20 });
            mockEmployeesRepo.findById.mockResolvedValue({ id: 100, departmentId: 4 });
            deptRepo.find.mockResolvedValue([{ id: 3 }]);

            await expect(service.delete(1, userContext)).rejects.toThrow(
                BadRequestException
            );
        });
    });
});
