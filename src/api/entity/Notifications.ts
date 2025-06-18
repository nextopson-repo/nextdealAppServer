import { randomBytes } from 'crypto';
import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';

export enum NotificationType {
  WELCOME = 'welcome',
  VERIFICATION = 'verification',
  PROPERTY = 'property',
  REPUBLISH = 'republish',
  ENQUIRY = 'enquiry',
  REVIEW = 'review',
  BOOST = 'boost',
  BROADCAST = 'broadcast',
  TESTING = 'testing',
  ALERT = 'alert',
  WARNING = 'warning',
  OTHER = 'other',
  KYC = 'kyc'
}

@Entity('Notifications')
export class Notifications extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  message!: string;

  @Column({ type: 'enum', enum: NotificationType, nullable: true })
  type!: NotificationType;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'longtext', nullable: true })
  mediakey!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  button?: string;

  @Column({ type: 'json', nullable: true })
  property?: {
    title?: string;
    price?: string;
    location?: string;
    image?: string;
  };

  @Column({ type: 'varchar', length: 512, nullable: true })
  status?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: 'default' })
  sound?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: 'default' })
  vibration?: string;

  @Column({ type: 'varchar', default: 'system' })
  createdBy!: string;

  @Column({ type: 'varchar', default: 'system' })
  updatedBy?: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
  updatedAt!: Date;


  @BeforeInsert()
  private async beforeInsert() {
    this.id = this.generateUUID();
  }

  private generateUUID(): string {
    return randomBytes(16).toString('hex');
  }
}
