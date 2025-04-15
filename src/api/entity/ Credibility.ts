import {
    BaseEntity,
    BeforeInsert,
    BeforeUpdate,
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryColumn,
  } from 'typeorm';
  import { UserAuth } from './UserAuth';
  
  @Entity('user_credibility')
  export class Credibility extends BaseEntity {
    @PrimaryColumn('uuid')
    userId!: string;
  
    @OneToOne(() => UserAuth)
    @JoinColumn({ name: 'user_id' })
    user!: UserAuth;
  
    @Column({ type: 'int', default: 100 })
    credibilityScore!: number;
  
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
  
    
  }