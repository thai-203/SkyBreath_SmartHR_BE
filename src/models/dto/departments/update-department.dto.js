import { IsString, IsOptional, IsInt, Min } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateDepartmentDto:
 *       type: object
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
export class UpdateDepartmentDto {
    @IsOptional()
    @IsString()
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
