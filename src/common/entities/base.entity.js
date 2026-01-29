import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Column,
} from 'typeorm';

export class BaseEntity {
    @PrimaryGeneratedColumn()
    id;

    @CreateDateColumn({ name: 'created_at' })
    createdAt;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt;

    @Column({ name: 'is_deleted', type: 'boolean', default: false })
    isDeleted;
}
