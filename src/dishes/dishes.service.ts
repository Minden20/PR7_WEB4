import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { randomBytes } from 'node:crypto';
import { DishCategory, DishEntity } from './entities/dish.entity.js';
import { CreateDishDto } from './dto/create-dish.dto.js';
import { UpdateDishDto } from './dto/update-dish.dto.js';
import { QueryDishesDto } from './dto/query-dishes.dto.js';
import { SlugService } from '../shared/slug/slug.service.js';
import { Paginated } from '../common/interfaces/paginated.interface.js';

const SEED_DISHES: CreateDishDto[] = [
  {
    title: 'Український борщ із пампушками',
    price: 195,
    weightGrams: 400,
    calories: 380,
    isSpicy: false,
    category: DishCategory.SOUP,
  },
  {
    title: 'Піца Діавола з перцем халапеньйо',
    price: 290,
    weightGrams: 480,
    calories: 820,
    isSpicy: true,
    category: DishCategory.PIZZA,
  },
  {
    title: 'Том Ям з королівськими креветками',
    price: 340.5,
    weightGrams: 360,
    calories: 310,
    isSpicy: true,
    category: DishCategory.SOUP,
  },
];

@Injectable()
export class DishesService implements OnModuleInit {
  private readonly logger = new Logger(DishesService.name);

  constructor(
    @InjectRepository(DishEntity)
    private readonly dishRepo: Repository<DishEntity>,
    private readonly slugService: SlugService,
  ) {}

  /** Початкове наповнення — лише якщо таблиця повністю порожня. */
  async onModuleInit(): Promise<void> {
    const count = await this.dishRepo.count({ withDeleted: true });
    if (count > 0) {
      this.logger.log(`У базі вже є ${count} страв(и) — сидування пропущено.`);
      return;
    }
    for (const dto of SEED_DISHES) {
      await this.create(dto);
    }
    this.logger.log(`Додано ${SEED_DISHES.length} початкові страви у БД.`);
  }

  async create(dto: CreateDishDto): Promise<DishEntity> {
    const dish = this.dishRepo.create({
      ...dto,
      slug: await this.generateUniqueSlug(dto.title),
    });
    return this.dishRepo.save(dish);
  }

  /** Offset-пагінація + сортування + фільтри. */
  async findAll(
    query: Partial<QueryDishesDto> = {},
  ): Promise<Paginated<DishEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const order = query.order ?? 'DESC';

    const where: FindOptionsWhere<DishEntity> = {};
    if (query.search) where.title = ILike(`%${query.search}%`);
    if (query.isSpicy !== undefined) where.isSpicy = query.isSpicy;
    if (query.maxPrice !== undefined)
      where.price = LessThanOrEqual(query.maxPrice);

    const [data, total] = await this.dishRepo.findAndCount({
      where,
      // id — додатковий ключ для стабільного порядку між сторінками
      order: { [sortBy]: order, id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Лише м'яко видалені записи (кошик). */
  async findDeleted(): Promise<DishEntity[]> {
    return this.dishRepo.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
      order: { deletedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<DishEntity> {
    const dish = await this.dishRepo.findOneBy({ id });
    if (!dish) {
      throw new NotFoundException(`Сутність з ID ${id} не знайдена`);
    }
    return dish;
  }

  async findBySlug(slug: string): Promise<DishEntity> {
    const dish = await this.dishRepo.findOneBy({
      slug: slug.toLowerCase().trim(),
    });
    if (!dish) {
      throw new NotFoundException(`Страву зі slug "${slug}" не знайдено`);
    }
    return dish;
  }

  async update(id: string, dto: UpdateDishDto): Promise<DishEntity> {
    const dish = await this.findOne(id);
    if (dto.title !== undefined && dto.title !== dish.title) {
      dish.slug = await this.generateUniqueSlug(dto.title);
    }
    this.dishRepo.merge(dish, dto);
    return this.dishRepo.save(dish);
  }

  /** М'яке видалення: заповнює deletedAt, рядок лишається в таблиці. */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.dishRepo.softDelete(id);
  }

  async restore(id: string): Promise<DishEntity> {
    const dish = await this.dishRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!dish) {
      throw new NotFoundException(`Сутність з ID ${id} не знайдена`);
    }
    if (dish.deletedAt) {
      await this.dishRepo.restore(id);
    }
    return this.findOne(id);
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = this.slugService.generateSlug(title);
    const taken = await this.dishRepo.exists({
      where: { slug: base },
      withDeleted: true,
    });
    return taken ? `${base}-${randomBytes(3).toString('hex')}` : base;
  }
}
