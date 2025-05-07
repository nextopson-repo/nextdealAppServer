import { randomBytes } from "crypto";
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Property } from "./Property";

@Entity('PropertyImages')
export class PropertyImages extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  imageKey!: string;

  @Column({ type: 'varchar', nullable: false })
  presignedUrl!: string;

  @Column({ type: "enum", enum: ['Bathroom', 'Bedroom', 'Dining', 'Kitchen', 'Livingroom'], default: null })
  imgClassifications!: string;

  @Column({ type: 'int', default: null })
  accurencyPercent!: number;

  @Column({ type: 'uuid', nullable: true })
  propertyId!: string;

  @ManyToOne(() => Property, (property) => property.propertyImages)
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @Column({ type: 'varchar', nullable: false })
  createdBy!: string;

  @Column({ type: 'varchar', nullable: false })
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