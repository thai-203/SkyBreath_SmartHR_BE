/**
 * @swagger
 * components:
 *   schemas:
 *     ActionLogQueryDto:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           default: 1
 *         limit:
 *           type: integer
 *           default: 10
 *         search:
 *           type: string
 *         actionType:
 *           type: string
 *         userId:
 *           type: integer
 *         targetTable:
 *           type: string
 *         fromDate:
 *           type: string
 *           format: date
 *           example: "01/01/2024"
 *         toDate:
 *           type: string
 *           format: date
 *           example: "31/12/2024"
 *         status:
 *           type: string
 *           enum: [SUCCESS, FAILED]
 *         sortBy:
 *           type: string
 *         sortOrder:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 */
export class ActionLogQueryDto {
  page = 1;
  limit = 10;
  search;
  actionType;
  userId;
  targetTable;
  fromDate;
  toDate;
  status;
  sortBy;
  sortOrder = 'DESC';

  get skip() {
    return (this.page - 1) * this.limit;
  }
}