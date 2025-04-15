import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
  } from 'typeorm';
  import { UserAuth } from './UserAuth';
  import { Property } from './Property';
  
  @Entity('republish_properties_table')
  export class RepublishProperties extends BaseEntity {
    @PrimaryColumn('uuid')
    userId!: string;
  
    @PrimaryColumn('uuid')
    propertyId!: string;
  
    @ManyToOne(() => UserAuth, (user) => user.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: UserAuth;
  
    @ManyToOne(() => Property, (property) => property.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'property_id' })
    property!: Property;
  
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