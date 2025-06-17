import {
    BaseEntity,
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
  } from 'typeorm';
import { randomBytes } from 'crypto';
import { Property } from './Property';
  
  @Entity('RepublishProperty')
  export class RepublishProperty extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column('uuid')
    propertyId!: string;
  
    @Column('uuid')
    ownerId!: string;
  
    @Column('uuid')
    republisherId!: string;
    
    @Column({ 
      type: 'enum', 
      enum: ['Accepted', 'Rejected', 'Pending'],
      default: 'Pending' 
    })
    status!: 'Accepted' | 'Rejected' | 'Pending';
    
    @ManyToOne(() => Property, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'propertyId' })
    property!: Property;
    
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