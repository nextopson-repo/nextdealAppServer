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
import { PropertyImages } from "./PropertyImages";

@Entity('Property')
export class Property extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => Address, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addressId' })
  address!: Address;

  @OneToMany(() => PropertyImages, (propertyImages) => propertyImages.property, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'propertyImages' })
  propertyImages!: PropertyImages[];

  @Column({ type: 'varchar', nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: false })
  description!: string;

  @Column({ type: 'boolean', default: false })
  isActive!: boolean;

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

  @Column({ type: 'int', default: 0 })
  propertyPrice!: number;

  @Column({ type: 'boolean', default: false })
  isSold!: boolean;

  @Column({ type: 'simple-array', nullable: true }) 
  conversion!: string[];

  @Column({ type: 'float', nullable: true })
  carpetArea!: number;

  @Column({ type: 'float', nullable: true })
  buildupArea!: number;

  @Column({ type: 'int', nullable: true })
  bhks!: number;
   
  @Column({ type: 'varchar', nullable: true })
  furnishing!: string;

  @Column({ type: 'simple-array', nullable: true })
  addFurnishing!: string[];

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
  length!: number;

  @Column({ type: 'float', nullable: true })
  totalArea!: number;

  @Column({ type: 'float', nullable: true })
  plotArea!: number;

  @Column({ type: 'simple-array', nullable: true })
  viewFromProperty!: string[];

  @Column({ type: 'float', nullable: true })
  landArea!: number;

  @Column({ type: 'float', nullable: true })
  distFromOutRRoad!: number;

  @Column({ type: 'varchar', nullable: true })
  unit!: string;

  @Column({ type: 'varchar', nullable: true })
  soilType!: string;

  @Column({ type: 'varchar', nullable: true })
  approachRoad!: string;

  @Column({ type: 'varchar', nullable: true })
  totalfloors!: string;

  @Column({ type: 'varchar', nullable: true })
  officefloor!: string;

  @Column({ type: 'varchar', nullable: true })
  yourfloor!: string;

  @Column({ type: 'varchar', nullable: true })
  cabins!: string;

  @Column({ type: 'varchar', nullable: true })
  parking!: string;

  @Column({ type: 'varchar', nullable: true })
  washroom!: string;

  @Column({ type: 'varchar', nullable: true })
  availablefor!: string;

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
