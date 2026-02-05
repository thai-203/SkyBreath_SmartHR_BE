import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Matches } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateDepartmentDto:
 *       type: object
 *       required:
 *         - departmentName
 *       properties:
 *         departmentName:
 *           type: string
 *           description: The name of the department
 *           example: Human Resources
 *         parentDepartmentId:
 *           type: integer
 *           description: The ID of the parent department
 *           example: 1
 *         managerEmployeeId:
 *           type: integer
 *           description: The ID of the manager employee
 *           example: 5
 */
export class CreateDepartmentDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-zA-Z0-9À-ỹ\s]+$/, { message: 'Tên phòng ban chỉ được chứa chữ cái, số và khoảng trắng' })
    departmentName;

    @IsOptional()
    @IsInt()
    @Min(1)
    parentDepartmentId;

    @IsOptional()
    @IsInt()
    @Min(1)
    managerEmployeeId;
}
