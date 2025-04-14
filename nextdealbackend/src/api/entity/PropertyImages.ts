// PropertyImages.ts
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { Property } from './Property';

@Entity('Property_image_table')
export class PropertyImage extends BaseEntity {
  @PrimaryColumn()
  propertyId!: string;

  @PrimaryColumn()
  imageId!: string;

  @ManyToOne(() => Property, (property) => property.propertyImages, {
    onDelete: 'CASCADE', // optional: when property is deleted, remove images too
  })
  @JoinColumn({ name: 'propertyId' }) // links propertyId in this table to id in Property
  property!: Property;

  @Column({ type: 'varchar', default: 'system' })
  createdBy!: string;

  @Column({ type: 'varchar', default: 'system' })
  updatedBy!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', precision: 6 })
  createdAt!: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    precision: 6,
  })
  updatedAt!: Date;
}
