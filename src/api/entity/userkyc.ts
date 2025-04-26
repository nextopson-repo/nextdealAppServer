import { randomBytes } from 'crypto';
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('userkyc')
export class userkyc extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'varchar', default: "pending" })
  kycStatus!: string;

  @Column({ type: 'varchar', nullable: true })
  reraId!: string;

  @Column({ type: 'boolean', default: false })
  rera!: boolean;

 

  @Column({ type: 'varchar', nullable: true })
  reraIdState!: string;

  @Column({ type: 'float', nullable: true })
  aadharcardNumber!: number;

  @Column({ type: 'varchar', nullable: true })
  aadharcardAddress!: string;

  @Column({ type: 'simple-array', nullable: true })
  aadharImageKeys!: string[];

  @Column({ type: 'varchar', nullable: true })
  selfieImageKey!: string;


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
