import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { UserEntity } from './user.entity.js';
import { DepartmentEntity } from './department.entity.js';
import { PositionEntity } from './position.entity.js';
import { JobGradeEntity } from './job-grade.entity.js';

@Entity('employees')
export class EmployeeEntity extends BaseEntity {
    @Column({ name: 'employee_code', unique: true, type: 'varchar', length: 20, nullable: true })
    employeeCode;

    @Column({ name: 'user_id', nullable: true, type: 'int' })
    userId;

    @OneToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user;

    @Column({ name: 'national_id', nullable: true, type: 'varchar' })
    nationalId;

    @Column({ name: 'national_id_issued_date', type: 'date', nullable: true })
    nationalIdIssuedDate;

    @Column({ name: 'national_id_issued_place', nullable: true, type: 'varchar' })
    nationalIdIssuedPlace;

    @Column({ name: 'full_name', type: 'varchar' })
    fullName;

    @Column({ name: 'date_of_birth', type: 'date', nullable: true })
    dateOfBirth;

    @Column({ nullable: true, type: 'varchar' })
    gender;

    @Column({ name: 'marital_status', nullable: true, type: 'varchar' })
    maritalStatus;

    @Column({ nullable: true, type: 'varchar' })
    nationality;

    @Column({ name: 'tax_code', nullable: true, type: 'varchar' })
    taxCode;

    @Column({ name: 'personal_email', nullable: true, type: 'varchar' })
    personalEmail;

    @Column({ name: 'company_email', nullable: true, type: 'varchar' })
    companyEmail;

    @Column({ name: 'phone_number', nullable: true, type: 'varchar' })
    phoneNumber;

    @Column({ name: 'education_level', nullable: true, type: 'varchar' })
    educationLevel;

    @Column({ name: 'permanent_address', nullable: true, type: 'varchar' })
    permanentAddress;

    @Column({ name: 'current_address', nullable: true, type: 'varchar' })
    currentAddress;

    @Column({ name: 'department_id', nullable: true, type: 'int' })
    departmentId;

    @ManyToOne(() => DepartmentEntity)
    @JoinColumn({ name: 'department_id' })
    department;

    @Column({ name: 'position_id', nullable: true, type: 'int' })
    positionId;

    @ManyToOne(() => PositionEntity)
    @JoinColumn({ name: 'position_id' })
    position;

    @Column({ name: 'direct_manager_id', nullable: true, type: 'int' })
    directManagerId;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'direct_manager_id' })
    directManager;

    @Column({ name: 'job_grade_id', nullable: true, type: 'int' })
    jobGradeId;

    @ManyToOne(() => JobGradeEntity)
    @JoinColumn({ name: 'job_grade_id' })
    jobGrade;

    @Column({ name: 'hr_mentor_id', nullable: true, type: 'int' })
    hrMentorId;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'hr_mentor_id' })
    hrMentor;

    @Column({ name: 'join_date', type: 'date', nullable: true })
    joinDate;

    @Column({ name: 'official_start_date', type: 'date', nullable: true })
    officialStartDate;

    @Column({ name: 'employment_status', nullable: true, type: 'varchar' })
    employmentStatus;

    @Column({ name: 'front_id_card_file_path', nullable: true, type: 'varchar' })
    frontIdCardFilePath;

    @Column({ name: 'back_id_card_file_path', nullable: true, type: 'varchar' })
    backIdCardFilePath;

    @Column({ nullable: true, type: 'varchar' })
    avatar;
}
