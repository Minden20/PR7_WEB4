import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DishesService } from './dishes.service.js';
import { DishCategory, DishEntity } from './entities/dish.entity.js';
import { SlugService } from '../shared/slug/slug.service.js';

const makeDish = (over: Partial<DishEntity> = {}): DishEntity =>
  Object.assign(new DishEntity(), {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Український борщ',
    slug: 'ukrayinskyi-borshch',
    price: 195,
    weightGrams: 400,
    calories: 380,
    isSpicy: false,
    category: DishCategory.SOUP,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  });

describe('DishesService', () => {
  let service: DishesService;
  const repo = {
    create: vi.fn((dto) => Object.assign(new DishEntity(), dto)),
    save: vi.fn(async (e) => ({ ...makeDish(), ...e })),
    merge: vi.fn((target, src) => Object.assign(target, src)),
    findAndCount: vi.fn(),
    findOneBy: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    count: vi.fn(),
    exists: vi.fn(async () => false),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DishesService,
        SlugService,
        { provide: getRepositoryToken(DishEntity), useValue: repo },
      ],
    }).compile();
    service = module.get(DishesService);
  });

  it('create: repo.create + repo.save, генерує slug', async () => {
    const created = await service.create({
      title: 'Салат Цезар з куркою',
      price: 210,
      weightGrams: 280,
      calories: 450,
      isSpicy: false,
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'salat-tsezar-z-kurkoyu' }),
    );
    expect(repo.save).toHaveBeenCalled();
    expect(created.title).toBe('Салат Цезар з куркою');
  });

  it('findAll: повертає дані та метадані пагінації', async () => {
    repo.findAndCount.mockResolvedValue([[makeDish()], 25]);
    const res = await service.findAll({
      page: 2,
      limit: 10,
      sortBy: 'price',
      order: 'ASC',
    });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        order: { price: 'ASC', id: 'ASC' },
      }),
    );
    expect(res.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
  });

  it('findOne: кидає NotFoundException, якщо null', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });

  it('update: зливає зміни та зберігає', async () => {
    repo.findOneBy.mockResolvedValue(makeDish());
    const updated = await service.update(makeDish().id, { price: 215.5 });
    expect(repo.merge).toHaveBeenCalled();
    expect(updated.price).toBe(215.5);
  });

  it('remove: виконує softDelete, а не delete', async () => {
    repo.findOneBy.mockResolvedValue(makeDish());
    await service.remove(makeDish().id);
    expect(repo.softDelete).toHaveBeenCalledWith(makeDish().id);
  });

  it('remove: NotFoundException для неіснуючої страви', async () => {
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('restore: відновлює м’яко видалений запис', async () => {
    const deleted = makeDish({ deletedAt: new Date() });
    repo.findOne.mockResolvedValue(deleted);
    repo.findOneBy.mockResolvedValue(makeDish());
    const res = await service.restore(deleted.id);
    expect(repo.restore).toHaveBeenCalledWith(deleted.id);
    expect(res.deletedAt).toBeNull();
  });
});
