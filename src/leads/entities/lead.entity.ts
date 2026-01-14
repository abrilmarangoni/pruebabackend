import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  nextAction: string;

  @Column({ default: 'manual' })
  source: string; // 'manual' | 'randomuser'

  @Column({ nullable: true })
  externalId: string; // UUID from randomuser for deduplication

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
