/**
 * @swagger
 * components:
 *   schemas:
 *     ActionLogResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         actionType:
 *           type: string
 *         targetTable:
 *           type: string
 *         targetRecordId:
 *           type: integer
 *         beforeData:
 *           type: object
 *         afterData:
 *           type: object
 *         changedFields:
 *           type: object
 *         description:
 *           type: string
 *         requestIp:
 *           type: string
 *         userAgent:
 *           type: string
 *         user:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 */

import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../users/user-response.dto.js';

@Exclude()
export class ActionLogResponseDto {
    @Expose()
    id;

    @Expose()
    userId;

    @Expose()
    actionType;

    @Expose()
    targetTable;

    @Expose()
    targetRecordId;

    @Expose()
    beforeData;

    @Expose()
    afterData;

    @Expose()
    changedFields;

    @Expose()
    description;

    @Expose()
    requestIp;

    @Expose()
    userAgent;

    @Expose()
    @Type(() => UserResponseDto)
    user;

    @Expose()
    createdAt;
}