import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';

export enum DishCategory {
  SOUP = 'soup',
  MAIN = 'main',
  PIZZA = 'pizza',
  SALAD = 'salad',
  DESSERT = 'dessert',
  DRINK = 'drink',
}

/**
 * Драйвер pg повертає decimal як рядок (щоб не втрачати точність).
 * Трансформер перетворює його назад у number для API.
 */
const decimalToNumber: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};

@Entity('dishes')
export class DishEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  slug: string;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    transformer: decimalToNumber,
  })
  price: number;

  @Column({ type: 'integer' })
  weightGrams: number;

  @Column({ type: 'integer' })
  calories: number;

  @Column({ type: 'boolean', default: false })
  isSpicy: boolean;

  @Column({ type: 'enum', enum: DishCategory, default: DishCategory.MAIN })
  category: DishCategory;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deletedAt: Date | null;
}
