import { AppDataSource } from '../database/data-source.js';
import { TaskAssignmentEntity } from '../models/entities/task-assignment.entity.js';

export class TaskAssignmentsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(TaskAssignmentEntity);
    }

    async findAll(skip = 0, take = 10) {
        return this.repository.find({
            relations: ['progress', 'task', 'assignedToEmployee', 'assignedByUser'],
            where: { isDeleted: false },
            skip,
            take,
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['progress', 'task', 'assignedToEmployee', 'assignedByUser']
        });
    }

    async findByProgressId(progressId) {
        return this.repository.find({
            where: { progressId, isDeleted: false },
            relations: ['task', 'assignedToEmployee', 'assignedByUser'],
            order: { createdAt: 'DESC' }
        });
    }

    async findByAssignedEmployee(employeeId) {
        return this.repository.find({
            where: { assignedToEmployeeId: employeeId, isDeleted: false },
            relations: ['progress', 'task', 'assignedByUser'],
            order: { dueDate: 'ASC' }
        });
    }

    async findByStatus(status) {
        return this.repository.find({
            where: { status, isDeleted: false },
            relations: ['progress', 'task', 'assignedToEmployee'],
            order: { createdAt: 'DESC' }
        });
    }

    async findOverdueAssignments() {
        return this.repository.createQueryBuilder('assignment')
            .leftJoinAndSelect('assignment.progress', 'progress')
            .leftJoinAndSelect('assignment.task', 'task')
            .leftJoinAndSelect('assignment.assignedToEmployee', 'employee')
            .where('assignment.dueDate < NOW()')
            .andWhere('assignment.status != :completedStatus', { completedStatus: 'COMPLETED' })
            .andWhere('assignment.isDeleted = :isDeleted', { isDeleted: false })
            .orderBy('assignment.dueDate', 'ASC')
            .getMany();
    }

    async create(data) {
        const assignment = this.repository.create(data);
        return this.repository.save(assignment);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        return this.repository.update(id, { isDeleted: true });
    }

    async countByStatus(status) {
        return this.repository.count({ 
            where: { status, isDeleted: false } 
        });
    }
}
