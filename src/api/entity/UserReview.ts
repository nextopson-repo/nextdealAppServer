import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
  BeforeInsert,
} from 'typeorm';
import { UserAuth } from './index';
import { randomBytes } from 'crypto';

@Entity('userReviews')
export class UserReview extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'userId', type: 'varchar', length: 36 })
  userId!: string;

  @Column({ name: 'reviewerId', type: 'varchar', length: 36 })
  reviewerId!: string;

  @Column({ type: 'text', nullable: true })
  message!: string;

  @Column({ type: 'int', default: 0 })
  rating!: number;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isReported!: boolean;

  @Column({ type: 'text', nullable: true })
  reportReason!: string | null;

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

  @ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserAuth;

  @ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer!: UserAuth;

  @BeforeInsert()
  async generateUUID() {
    this.id = randomBytes(16).toString('hex');
  }

  // Helper methods
  updateRating(newRating: number): void {
    if (newRating >= 0 && newRating <= 10) {
      this.rating = newRating;
    } else {
      throw new Error('Rating must be between 0 and 10');
    }
  }

  markAsVerified(): void {
    this.isVerified = true;
  }

  reportReview(reason: string): void {
    this.isReported = true;
    this.reportReason = reason;
  }

  removeReport(): void {
    this.isReported = false;
    this.reportReason = null;
  }
}
