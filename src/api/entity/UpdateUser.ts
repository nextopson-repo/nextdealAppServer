import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

export type AccountType = "Agent" | "User"; // Add more if needed

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
    id!: string;

  @Column()
    fullName!: string;

  @Column({ unique: true })
    email!: string;

  @Column({ type: "enum", enum: ["Agent", "User"], default: "User" })
    accountType!: AccountType;

  @Column({ nullable: true })
  profilePicture?: string;
}
