import { randomBytes } from "crypto";
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
} from "typeorm";
import { Address } from "./Address";
import { PropertyImage } from "./PropertyImages";

@Entity('Property')
export class Property extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'addressId' })
  address!: Address;

  @OneToMany(() => PropertyImage, (image) => image.property)
  propertyImageKeys!: PropertyImage[];

  @Column({ type: 'varchar', nullable: false })
  category!: string;

   @Column({ type: 'varchar', nullable: false })
  subCategory!: string;

  @Column({ type: 'varchar', nullable: true })
  projectName!: string;

  @Column({ type: 'varchar', nullable: true })
  propertyName!: string;

  @Column({ type: 'boolean', nullable: true })
  isSale!: boolean;

  @Column({ type: 'int', nullable: true })
  totalBathrooms!: number;

  @Column({ type: 'int', nullable: true })
  totalRooms!: number;

  @Column({ type: 'decimal' })
  propertyPrice!: number;

  @Column({ type: 'float', nullable: true })
  carpetArea!: number;

  @Column({ type: 'float', nullable: true })
  buildupArea!: number;

  @Column({ type: 'int', nullable: true })
  bhks!: number;

  @Column({ type: 'varchar', nullable: true })
  furnishing!: string;

  @Column({ type: 'varchar', nullable: true })
  constructionStatus!: string;

  @Column({ type: 'varchar', nullable: true })
  propertyFacing!: string;

  @Column({ type: 'varchar', nullable: true })
  ageOfTheProperty!: string;

  @Column({ type: 'boolean', nullable: true })
  reraApproved!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  amenities!: string[];

  @Column({ type: 'float', nullable: true })
  width!: number;

  @Column({ type: 'float', nullable: true })
  height!: number;

  @Column({ type: 'float', nullable: true })
  totalArea!: number;

  @Column({ type: 'float', nullable: true })
  plotArea!: number;

  @Column({ type: 'varchar', nullable: true })
  viewFromProperty!: string;

  @Column({ type: 'float', nullable: true })
  landArea!: number;

  @Column({ type: 'varchar', nullable: true })
  unit!: string;

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
