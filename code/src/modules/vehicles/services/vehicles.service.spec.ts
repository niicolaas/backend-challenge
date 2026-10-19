import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from 'src/common/enums/role.enum';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { VehicleType } from '../enums/vehicle-type.enum';
import { VehiclesService } from './vehicles.services';

jest.mock('@casl/prisma', () => ({
  accessibleBy: jest.fn(() => ({ Vehicle: {} })),
}));

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: {
    vehicle: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };
  let abilityFactory: { createForUser: jest.Mock };

  const admin: AuthUser = { id: 'user-admin', role: Role.ADMIN, companyId: null };

  const createDto = {
    plate: 'rio-2a45',
    brand: 'Fiat',
    model: 'Toro',
    year: 2024,
    vehicleType: VehicleType.CAR,
    isActive: true,
    description: 'Veículo da supervisão',
    companyId: 'company-1',
  };

  beforeEach(() => {
    prisma = {
      vehicle: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    abilityFactory = {
      createForUser: jest.fn().mockReturnValue({
        can: () => true,
        relevantRuleFor: () => ({ conditions: {} }),
        rulesFor: () => [{ action: 'manage', subject: 'Vehicle' }],
      }),
    };

    service = new VehiclesService(prisma as any, abilityFactory as any);
  });

  describe('create', () => {
    it('cria o veículo e retorna id e mensagem de sucesso', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({ id: 'vehicle-1' });

      const result = await service.create(createDto, admin);

      expect(result).toEqual({ id: 'vehicle-1', message: 'Veículo criado com sucesso' });
      expect(prisma.vehicle.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          plate: 'RIO2A45',
        },
        select: { id: true },
      });
    });

    it('lança ConflictException (409) quando já existe um veículo não excluído com a mesma placa', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'vehicle-existing' });

      await expect(service.create(createDto, admin)).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            plate: 'RIO2A45',
            deletedAt: null,
          }),
        }),
      );
      expect(prisma.vehicle.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('lança NotFoundException (404) quando o veículo não existe ou está fora do escopo do usuário', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findOne('inexistente', admin)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('retorna os dados com o meta de paginação calculado', async () => {
      const vehicles = [{ id: 'vehicle-1' }, { id: 'vehicle-2' }];
      prisma.vehicle.findMany.mockResolvedValue(vehicles);
      prisma.vehicle.count.mockResolvedValue(25);

      const result = await service.findAll(
        { page: 2, limit: 10, orderBy: 'createdAt', order: 'desc' },
        admin,
      );

      expect(result).toEqual({
        data: vehicles,
        meta: { total: 25, page: 2, limit: 10, totalPages: 3 },
      });
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('remove', () => {
    it('faz soft delete preenchendo deletedAt em vez de apagar o registro', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'vehicle-1' });

      await service.remove('vehicle-1', admin);

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});