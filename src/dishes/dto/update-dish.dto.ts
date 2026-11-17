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

export class UpdateDishDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly title?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999999.99)
  readonly price?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  readonly weightGrams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly calories?: number;

  @IsOptional()
  @IsBoolean()
  readonly isSpicy?: boolean;

  @IsOptional()
  @IsEnum(DishCategory)
  readonly category?: DishCategory;
}
