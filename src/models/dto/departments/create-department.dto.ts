import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

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
    departmentName: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    parentDepartmentId?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    managerEmployeeId?: number;
}
