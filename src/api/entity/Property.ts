import { randomBytes } from "crypto";
import { BaseEntity, BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('Property')
export class Property extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;


  @Column({ type: 'varchar',  })
  userId!: string; // take from userAuth




    @Column({ type: 'varchar', default: 'system' })
    createdBy!: string;
  
    @Column({ type: 'varchar', default: 'system' })
    updatedBy!: string;
  
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', precision: 6 })
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
      // Any update logic if needed
    }

    // realation from userAuth entity
  
}
