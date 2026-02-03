import { AppMessages } from '../common/constants/index.js';
import { NotFoundException, ConflictException } from '../common/exceptions/index.js';

export class EmployeesService {
    constructor(employeesRepository) {
        this.employeesRepository = employeesRepository;
    }

    async findAll(options) {
        return this.employeesRepository.findList(options);
    }

    async findById(id) {
        const employee = await this.employeesRepository.findById(id);
        if (!employee) {
            throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
        }
        return employee;
    }

    async update(id, updateDto) {
        const employee = await this.findById(id);

        if (updateDto.personalEmail) {
            const existing = await this.employeesRepository.findByField('personalEmail', updateDto.personalEmail, id);
            if (existing) {
                throw new ConflictException(AppMessages.Errors.Employee.EMAIL_DUPLICATE);
            }
        }

        if (updateDto.phoneNumber) {
            const existing = await this.employeesRepository.findByField('phoneNumber', updateDto.phoneNumber, id);
            if (existing) {
                throw new ConflictException(AppMessages.Errors.Employee.PHONE_DUPLICATE);
            }
        }

        if (updateDto.nationalId) {
            const existing = await this.employeesRepository.findByField('nationalId', updateDto.nationalId, id);
            if (existing) {
                throw new ConflictException(AppMessages.Errors.Employee.NATIONAL_ID_DUPLICATE);
            }
        }

        return this.employeesRepository.update(employee.id, updateDto);
    }

    async delete(id) {
        const employee = await this.findById(id);
        return this.employeesRepository.softDelete(employee.id);
    }
}
