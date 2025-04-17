import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Property } from './Property';
import { randomBytes } from 'crypto';

@Entity('PropertyImage')
export class PropertyImage extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Property)
    @JoinColumn({ name: 'propertyId' })
    property!: Property;

    @Column({ type: 'varchar' })
    imageKey!: string;

    @Column({ type: 'varchar', nullable: true })
    imageName!: string;

    @Column({ type: 'varchar', default: 'system' })
    createdBy!: string;

    @Column({ type: 'varchar', default: 'system' })
    updatedBy!: string;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', precision: 6 })
    createdAt!: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)',
        precision: 6,
    })
    updatedAt!: Date;

    @BeforeInsert()
    async generateUUID() {
        this.id = randomBytes(16).toString('hex');
    }

    @BeforeUpdate()
    async updateTimestamp() {
        // Optional: Custom update logic
    }
}
