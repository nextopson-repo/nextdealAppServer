import {
    BaseEntity,
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
import { randomBytes } from 'crypto';
  
  @Entity('UserCredibility')
  export class UserCredibility extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column('uuid')
    userId!: string;
  
    @Column({ type: 'int', default: 100 })
    credibilityScore!: number;
  
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