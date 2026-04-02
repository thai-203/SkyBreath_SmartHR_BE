import { AppDataSource } from '../database/data-source.js';
import { FaceDataEntity } from '../models/entities/face-data.entity.js';

export class FaceDataRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(FaceDataEntity);
  }

  async findAll(options = {}) {
    const { skip = 0, take = 10, search } = options;

    // ── Subquery: group face_data theo employee, lấy count + lastRegisteredAt ──
    const subQuery = this.repository
      .createQueryBuilder('fd')
      .select('fd.employee_id', 'employeeId')
      .addSelect('COUNT(fd.id)', 'count')
      .addSelect('MAX(fd.registered_at)', 'lastRegisteredAt')
      .where('fd.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('fd.employee_id');

    // ── Main query: join subquery với employee để lấy thông tin join sẵn ──
    const query = this.repository.manager
      .createQueryBuilder()
      .select([
        'emp.id                         AS employeeId',
        'emp.employee_code              AS employeeCode',
        'emp.full_name                  AS fullName',
        'emp.avatar                     AS avatar',
        'emp.company_email              AS companyEmail',
        'emp.phone_number               AS phoneNumber',
        'dept.department_name           AS departmentName',
        'pos.position_name              AS positionName',
        'grouped.count                  AS count',
        'grouped.lastRegisteredAt       AS lastRegisteredAt',
      ])
      .from('employees', 'emp')
      .innerJoin(
        `(${subQuery.getQuery()})`,
        'grouped',
        'grouped.employeeId = emp.id',
      )
      .leftJoin(
        'departments',
        'dept',
        'dept.id = emp.department_id AND dept.is_deleted = false',
      )
      .leftJoin(
        'positions',
        'pos',
        'pos.id  = emp.position_id  AND pos.is_deleted = false',
      )
      .where('emp.is_deleted = :isDeleted', { isDeleted: false })
      .setParameters(subQuery.getParameters());

    if (search) {
      query.andWhere(
        '(emp.full_name LIKE :search OR emp.employee_code LIKE :search OR emp.company_email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // ── Đếm tổng rows (trước khi phân trang) ──
    const totalQuery = query.clone();
    const rawTotal = await totalQuery.getRawMany();
    const total = rawTotal.length;

    // ── Tổng số ảnh toàn hệ thống (cho stat card) ──
    const totalFaces = await this.repository
      .createQueryBuilder('fd')
      .where('fd.isDeleted = :isDeleted', { isDeleted: false })
      .getCount();

    // ── Phân trang + sort ──
    const items = await query
      .orderBy('grouped.lastRegisteredAt', 'DESC')
      .offset(skip)
      .limit(take)
      .getRawMany();

    // ── Map camelCase + cast đúng kiểu ──
    const mapped = items.map((row) => ({
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      fullName: row.fullName,
      avatar: row.avatar,
      companyEmail: row.companyEmail,
      phoneNumber: row.phoneNumber,
      departmentName: row.departmentName,
      positionName: row.positionName,
      count: Number(row.count),
      lastRegisteredAt: row.lastRegisteredAt,
    }));

    return { items: mapped, total, totalFaces };
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id },
      relations: ['employee'],
    });
  }

  async findByEmployeeIdWithEmpInfo(employeeId) {
    const faces = await this.repository
      .createQueryBuilder('fd')
      .leftJoin('fd.employee', 'emp')
      .leftJoin('emp.department', 'dept')
      .leftJoin('emp.position', 'pos')
      .select([
        'fd.id              AS id',
        'fd.employee_id     AS employeeId',
        'fd.image_url       AS imageUrl',
        'fd.registered_at   AS registeredAt',
        'emp.employee_code  AS employeeCode',
        'emp.full_name      AS fullName',
        'emp.avatar         AS avatar',
        'emp.company_email  AS companyEmail',
        'emp.phone_number   AS phoneNumber',
        'dept.department_name AS departmentName',
        'pos.position_name    AS positionName',
      ])
      .where('fd.employee_id = :employeeId', { employeeId })
      .andWhere('fd.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('fd.registered_at', 'DESC')
      .getRawMany();

    if (!faces.length) return null;

    // Tách employee info từ row đầu tiên, gom faces thành mảng riêng
    const first = faces[0];
    return {
      employee: {
        employeeId: first.employeeId,
        employeeCode: first.employeeCode,
        fullName: first.fullName,
        avatar: first.avatar,
        companyEmail: first.companyEmail,
        phoneNumber: first.phoneNumber,
        departmentName: first.departmentName,
        positionName: first.positionName,
      },
      count: faces.length,
      faces: faces.map((row) => ({
        id: row.id,
        employeeId: row.employeeId,
        imageUrl: row.imageUrl,
        registeredAt: row.registeredAt,
      })),
    };
  }

  async countData(employeeId) {
    return this.repository.count({ where: { employeeId } });
  }

  async findByEmployeeId(employeeId) {
    return this.repository.find({
      where: { employeeId },
      order: { registeredAt: 'DESC' },
    });
  }

  async create(data) {
    const face = this.repository.create(data);
    return this.repository.save(face);
  }

  async createMany(data) {
    const faces = this.repository.create(data);
    return this.repository.save(faces);
  }

  async deleteByEmployeeId(employeeId) {
    return this.repository.delete({
      employeeId: employeeId,
    });
  }

  async deleteById(id) {
    return this.repository.delete({ id });
  }
}
