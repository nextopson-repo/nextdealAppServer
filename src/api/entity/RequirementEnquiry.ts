import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { PropertyRequirement } from './PropertyRequirement';
import { UserAuth } from './UserAuth';
import { randomBytes } from 'crypto';

@Entity('RequirementEnquiry')
export class RequirementEnquiry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  requirementId!: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => PropertyRequirement, (requirement) => requirement.enquiries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement!: PropertyRequirement;

  @ManyToOne(() => UserAuth, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserAuth;

  @Column({ type: 'varchar', default: 'system' })
  createdBy!: string;

  @Column({ type: 'varchar', default: 'system' })
  updatedBy!: string;

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
