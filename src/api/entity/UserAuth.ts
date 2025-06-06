import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('UserAuth')
export class UserAuth extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  mobileNumber!: string;

  @Column({ type: 'enum', enum: ['Agent', 'Owner', 'EndUser', 'Investor'], nullable: true })
  userType!: 'Agent' | 'Owner' | 'EndUser' | 'Investor';

  @Column({ type: 'boolean', default: true }) 
  WorkingWithAgent!: boolean;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email!: string;

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userProfileKey!: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  emailOTP!: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  mobileOTP!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailOTPSentAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  mobileOTPSentAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isMobileVerified!: boolean;

  @Column({ type: 'varchar', nullable: true })
  profilePictureUploadId?: string;

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

  @Column({ type: 'boolean', default: false })
  isLocked!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'int', default: 0 })
  failedOTPAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAttempt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastOTPAttempt!: Date | null;

  firstName: any;
  lastName: any;
  sentRequests: any;
  receivedRequests: any;

  @BeforeInsert()
  async generateUUID() {
    this.id = randomBytes(16).toString('hex');
  }

  @BeforeUpdate()
  async updateTimestamp() {
    // Any update logic if needed
  }

  private generateOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  generateEmailOTP(): void {
    this.emailOTP = this.generateOTP();
    this.emailOTPSentAt = new Date();
    this.isEmailVerified = false;
  }

  generateMobileOTP(): void {
    this.mobileOTP = this.generateOTP();
    this.mobileOTPSentAt = new Date();
    this.isMobileVerified = false;
  }

  verifyEmailOTP(otp: string): boolean {
    if (this.emailOTP === otp) {
      this.isEmailVerified = true;
      this.emailOTP = null;
      return true;
    }
    return false;
  }

  verifyMobileOTP(otp: string): boolean {
    if (this.mobileOTP === otp) {
      this.isMobileVerified = true;
      this.mobileOTP = null;
      return true;
    }
    return false;
  }

  isFullyVerified(): boolean {
    return this.isEmailVerified && this.isMobileVerified;
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  static async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  lockAccount(minutes: number = 15): void {
    this.isLocked = true;
    this.lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
  }

  unlockAccount(): void {
    this.isLocked = false;
    this.lockedUntil = null;
    this.failedLoginAttempts = 0;
    this.failedOTPAttempts = 0;
  }

  incrementFailedLoginAttempts(): void {
    this.failedLoginAttempts += 1;
    this.lastLoginAttempt = new Date();

    if (this.failedLoginAttempts >= 5) {
      this.lockAccount();
    }
  }

  incrementFailedOTPAttempts(): void {
    this.failedOTPAttempts += 1;
    this.lastOTPAttempt = new Date();

    if (this.failedOTPAttempts >= 3) {
      this.lockAccount(5); // Lock for 5 minutes after 3 failed OTP attempts
    }
  }

  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.failedOTPAttempts = 0;
    this.lastLoginAttempt = null;
    this.lastOTPAttempt = null;
  }
}
