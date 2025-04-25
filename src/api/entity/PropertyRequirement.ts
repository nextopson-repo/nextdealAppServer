import {
  BaseEntity,
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Address } from './Address';
import { randomBytes } from 'crypto';

@Entity('PropertyRequirement')
export class PropertyRequirement extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Address, (address) => address.addressFor)
  @JoinColumn({ name: 'addressId' })
  addressId!: Address;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  postId!: string;

  @Column({ type: 'varchar', nullable: true })
  minBudget!: string;

  @Column({ type: 'varchar', nullable: true })
  maxBugdget!: string;
  
  @Column({ type: 'varchar' })
  category!: string;

   @Column({ type: 'varchar' })
  subCategory!: string;
  
  @Column({ type: 'int', nullable: true })
  bhks!: number;

  @Column({ type: 'varchar', nullable: true })
  furnishing!: string;

  @Column({ type: 'boolean', nullable: true })
  isSale!: boolean;

  @Column({ type: 'varchar', nullable: true })
  bhkRequired!: string;

  @Column({ type: 'float', nullable: true })
  landArea!: number;

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
}
