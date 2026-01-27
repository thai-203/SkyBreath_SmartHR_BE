import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserEntity } from './user.entity';
import { DepartmentEntity } from './department.entity';
import { PositionEntity } from './position.entity';
import { JobGradeEntity } from './job-grade.entity';

@Entity('employees')
export class EmployeeEntity extends BaseEntity {
    @Column({ name: 'user_id', nullable: true })
    userId: number;

    @OneToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ name: 'national_id', nullable: true })
    nationalId: string;

    @Column({ name: 'national_id_issued_date', type: 'date', nullable: true })
    nationalIdIssuedDate: Date;

    @Column({ name: 'national_id_issued_place', nullable: true })
    nationalIdIssuedPlace: string;

    @Column({ name: 'full_name' })
    fullName: string;

    @Column({ name: 'date_of_birth', type: 'date', nullable: true })
    dateOfBirth: Date;

    @Column({ nullable: true })
    gender: string;

    @Column({ name: 'marital_status', nullable: true })
    maritalStatus: string;

    @Column({ nullable: true })
    nationality: string;

    @Column({ name: 'tax_code', nullable: true })
    taxCode: string;

    @Column({ name: 'personal_email', nullable: true })
    personalEmail: string;

    @Column({ name: 'company_email', nullable: true })
    companyEmail: string;

    @Column({ name: 'phone_number', nullable: true })
    phoneNumber: string;

    @Column({ name: 'education_level', nullable: true })
    educationLevel: string;

    @Column({ name: 'permanent_address', nullable: true })
    permanentAddress: string;

    @Column({ name: 'current_address', nullable: true })
    currentAddress: string;

    @Column({ name: 'department_id', nullable: true })
    departmentId: number;

    @ManyToOne(() => DepartmentEntity)
    @JoinColumn({ name: 'department_id' })
    department: DepartmentEntity;

    @Column({ name: 'position_id', nullable: true })
    positionId: number;

    @ManyToOne(() => PositionEntity)
    @JoinColumn({ name: 'position_id' })
    position: PositionEntity;

    @Column({ name: 'direct_manager_id', nullable: true })
    directManagerId: number;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'direct_manager_id' })
    directManager: EmployeeEntity;

    @Column({ name: 'job_grade_id', nullable: true })
    jobGradeId: number;

    @ManyToOne(() => JobGradeEntity)
    @JoinColumn({ name: 'job_grade_id' })
    jobGrade: JobGradeEntity;

    @Column({ name: 'hr_mentor_id', nullable: true })
    hrMentorId: number;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'hr_mentor_id' })
    hrMentor: EmployeeEntity;

    @Column({ name: 'join_date', type: 'date', nullable: true })
    joinDate: Date;

    @Column({ name: 'official_start_date', type: 'date', nullable: true })
    officialStartDate: Date;

    @Column({ name: 'employment_status', nullable: true })
    employmentStatus: string;

    @Column({ name: 'front_id_card_file_path', nullable: true })
    frontIdCardFilePath: string;

    @Column({ name: 'back_id_card_file_path', nullable: true })
    backIdCardFilePath: string;

    @Column({ nullable: true })
    avatar: string;
}
