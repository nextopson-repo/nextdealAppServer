import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    BaseEntity,
    OneToOne,
    BeforeInsert,
    BeforeUpdate,
    JoinColumn,
  } from 'typeorm';
  import { Property } from './Property';
import { randomBytes } from 'crypto';
  
  @Entity('Address')
  export class Address extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column({ type: 'varchar', nullable:true })
    state!: string;
  
    @Column({ type: 'varchar', nullable:true })
    city!: string;
  
    @Column({ type: 'varchar', nullable:true }) 
    locality!: string;
  
    @OneToOne(() => Property, (property) => property.address)
    @JoinColumn()
    addressFor!: Property;
  
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
    
    @BeforeUpdate()
    async updateTimestamp() {
      // Optional: Custom update logic
    }
    
  }
  