import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsBoolean,
  IsInt,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { DishCategory } from '../entities/dish.entity.js';

export class CreateDishDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly title: string;

  // decimal(8,2): до 999999.99, не більше 2 знаків після коми
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999999.99)
  readonly price: number;

  @IsInt()
  @Min(10)
  readonly weightGrams: number;

  @IsInt()
  @Min(0)
  readonly calories: number;

  @IsBoolean()
  readonly isSpicy: boolean;

  @IsOptional()
  @IsEnum(DishCategory)
  readonly category?: DishCategory;
}
