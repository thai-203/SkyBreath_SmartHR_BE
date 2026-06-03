import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsArray, ArrayMinSize, IsDateString } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateDepartmentTransferDto:
 *       type: object
 *       required:
 *         - fromDepartmentId
 *         - toDepartmentId
 *         - employeeIds
 *         - reason
 *         - effectiveDate
 *       properties:
 *         fromDepartmentId:
 *           type: integer
 *           description: The ID of the source department
 *           example: 1
 *         toDepartmentId:
 *           type: integer
 *           description: The ID of the destination department
 *           example: 2
 *         employeeIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of employee IDs to transfer
 *           example: [5, 6, 7]
 *         reason:
 *           type: string
 *           description: Reason for transfer
 *           example: Tổ chức lại nhân sự
 *         effectiveDate:
 *           type: string
 *           format: date
 *           description: Effective date of the transfer
 *           example: 2026-06-01
 *         note:
 *           type: string
 *           description: Additional notes
 *           example: Chuyển theo quyết định số 123
 */
export class CreateDepartmentTransferDto {
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    fromDepartmentId;

    @IsInt()
    @Min(1)
    @IsNotEmpty()
    toDepartmentId;

    @IsArray()
    @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 nhân viên' })
    @IsInt({ each: true })
    employeeIds;

    @IsString()
    @IsNotEmpty()
    reason;

    @IsDateString()
    @IsNotEmpty()
    effectiveDate;

    @IsOptional()
    @IsString()
    note;
}
