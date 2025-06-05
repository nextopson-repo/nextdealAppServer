import { randomBytes } from 'crypto';
import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

import { UserAuth } from './UserAuth';

@Entity('connections')
export class Connections extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserAuth, (UserAuth) => UserAuth.sentRequests, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'requesterId' })
  requester!: UserAuth;

  @Column({ type: 'uuid' })
  requesterId!: string;

  @ManyToOne(() => UserAuth, (UserAuth) => UserAuth.receivedRequests, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'receiverId' })
  receiver!: UserAuth;

  @Column({ type: 'uuid' })
  receiverId!: string;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected';

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
  updatedAt!: Date;
}
