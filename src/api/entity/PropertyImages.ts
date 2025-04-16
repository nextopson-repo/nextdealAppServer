// PropertyImages.ts
import { BaseEntity, BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne, PrimaryColumn, JoinColumn, OneToMany } from 'typeorm';

import { Property } from './Property';
import { randomBytes } from 'crypto';

@Entity('Property_image_table')
export class PropertyImage extends BaseEntity {
    @PrimaryColumn("uuid")
    id!: string;

    @ManyToOne(() => Property, (property) => property.images)
    @JoinColumn({ name: 'propertyId' })
    property!: Property;

    @Column({ type: 'varchar' })
    imageKey!: string;

    @Column({ type: 'varchar', default: 'system' })
    createdBy!: string;

    @Column({ type: 'varchar', default: 'system' })
    updatedBy!: string;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        precision: 6,
    })
    createdAt!: Date;

    @Column({
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
