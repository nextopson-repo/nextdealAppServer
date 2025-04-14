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
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Property } from './Property';

@Entity('UserAuth')
export class UserAuth extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  mobileNumber!: string;

  @Column({ type: 'enum', enum: ['Agent', 'Owner', 'EndUser', 'Investor'] })
  userType!: 'Agent' | 'Owner' | 'EndUser' | 'Investor';

  @Column({ type: 'varchar', length: 255, unique: true, })
  email!: string;

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userProfile!: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  emailOTP!: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  mobileOTP!: string | null;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isMobileVerified!: boolean;

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
    // Any update logic if needed
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateEmailOTP(): void {
    this.emailOTP = this.generateOTP();
    this.isEmailVerified = false;
  }

  generateMobileOTP(): void {
    this.mobileOTP = this.generateOTP();
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


  @OneToMany(() => Property, (property) => property.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  properties!: Property[];
}
