import { PayrollTypeRepository } from '../repositories/payroll-type.repository.js';
import { BadRequestException, NotFoundException, ConflictException } from '../common/exceptions/index.js';
import { APP_MESSAGES } from '../common/constants/app-messages.constant.js';

export class PayrollTypeService {
    constructor() {
        this.payrollTypeRepository = new PayrollTypeRepository();
    }

    async getAll(queryDto) {
        return await this.payrollTypeRepository.findAll(queryDto);
    }

    async getById(id) {
        const payrollType = await this.payrollTypeRepository.findById(id);
        if (!payrollType) {
            throw new NotFoundException('Không tìm thấy loại bảng lương');
        }
        return payrollType;
    }

    async create(createDto, userId) {
        // Check unique code
        const existingCode = await this.payrollTypeRepository.findByCode(createDto.payrollTypeCode);
        if (existingCode) {
            throw new ConflictException('Mã loại bảng lương đã tồn tại');
        }

        // Check unique keyword
        const existingKeyword = await this.payrollTypeRepository.findByKeyword(createDto.keyword);
        if (existingKeyword) {
            throw new ConflictException('Từ khóa đại diện đã tồn tại');
        }

        const data = {
            ...createDto,
            createdById: userId,
        };

        return await this.payrollTypeRepository.create(data);
    }

    async update(id, updateDto) {
        await this.getById(id);

        if (updateDto.payrollTypeCode) {
            const existingCode = await this.payrollTypeRepository.findByCode(updateDto.payrollTypeCode);
            if (existingCode && existingCode.id !== id) {
                throw new ConflictException('Mã loại bảng lương đã tồn tại');
            }
        }

        if (updateDto.keyword) {
            const existingKeyword = await this.payrollTypeRepository.findByKeyword(updateDto.keyword);
            if (existingKeyword && existingKeyword.id !== id) {
                throw new ConflictException('Từ khóa đại diện đã tồn tại');
            }
        }

        return await this.payrollTypeRepository.update(id, updateDto);
    }

    async delete(id) {
        await this.getById(id);
        return await this.payrollTypeRepository.delete(id);
    }
}
