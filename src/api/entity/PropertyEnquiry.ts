import { randomBytes } from 'crypto';
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Address } from './Address';
import { PropertyImages } from './PropertyImages';

@Entity('PropertyEnquiry')
export class PropertyEnquiry extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  propertyId!: string;

  @Column({ type: 'uuid', nullable: true })
  ownerId!: string;

  @OneToMany(() => PropertyImages, (propertyImages) => propertyImages.property)
  @JoinColumn({ name: 'propertyImages' })
  propertyImages!: PropertyImages[];

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'addressId' })
  address!: Address;

  @Column({ type: 'varchar', nullable: false })
  category!: string;

  @Column({ type: 'varchar', nullable: false })
  subCategory!: string;

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
  property: any;

  @BeforeInsert()
  async generateUUID() {
    this.id = randomBytes(16).toString('hex');
  }

  @BeforeUpdate()
  async updateTimestamp() {
    // Optional: Custom update logic
  }
}