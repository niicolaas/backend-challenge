import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AbilityFactory } from 'src/modules/ability/ability.factory';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVehicleDto } from '../dtos/create-vehicle.dto';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { Role } from 'src/common/enums/role.enum';
import { QueryVehicleDto } from '../dtos/query-vehicle.dto';
import { accessibleBy } from '@casl/prisma/runtime';
import { UpdateVehicleDto } from '../dtos/update-vehicle.dto';

const VEHICLE_SELECT = {
  id: true,
  plate: true,
  brand: true,
  model: true,
  year: true,
  vehicleType: true,
  isActive: true,
  description: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VehicleSelect;

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async create(data: CreateVehicleDto, user: AuthUser): Promise<{ id: string; message: string }> {
    const { companyId: dtoCompanyid, ...vehicleData } = data;

    const companyId = user.role === Role.ADMIN ? dtoCompanyid : user.companyId;

    if (!companyId) {
        throw new ConflictException('A empresa do veículo é obrigatória');
    }

    const normalizedPlate = vehicleData.plate.replace(/-/g, '').toUpperCase();

    await this.ensurePlateIsAvailable(normalizedPlate, companyId);

    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...vehicleData,
        plate: normalizedPlate,
        companyId,
      },
      select: { id: true },
    });

    this.logger.log(`Vehicle ${vehicle.id} created`);

    return { id: vehicle.id, message: 'Veículo criado com sucesso' };
  }

  async findAll(params: QueryVehicleDto, user: AuthUser) { 
    const { page, limit, orderBy, order, ...filters } = params;
    const skip = (page - 1) * limit;

    const ability = this.abilityFactory.createForUser(user);
    const where: Prisma.VehicleWhereInput = {
      AND: [accessibleBy(ability, 'read').Vehicle, this.buildFilters(filters), { deletedAt: null }],
    };

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        select: VEHICLE_SELECT,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
        data: vehicles,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const ability = this.abilityFactory.createForUser(user);

    const vehicle = await this.prisma.vehicle.findFirst({
        where: { AND: [{ id, deletedAt: null }, accessibleBy(ability, 'read').Vehicle] },
        select: VEHICLE_SELECT,
    });

    if(!vehicle) {
        throw new NotFoundException(`Veículo com ID ${id} não encontrada`);
    }

    return vehicle;
  }

  async update(id: string, data: UpdateVehicleDto, user: AuthUser): Promise<{ id: string; message: string }> {
    const vehicle = await this.findOne(id, user);

    if (data.plate) {
      const normalizedPlate = data.plate.replace(/-/g, '').toUpperCase();
      if(!user.companyId) {
        throw new ConflictException('A empresa do veículo é obrigatória');
      }
      await this.ensurePlateIsAvailable(normalizedPlate, vehicle.companyId, id);
      data.plate = normalizedPlate;
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id },
      data: data,
    });

    return { id: updatedVehicle.id, message: 'Veículo atualizado com sucesso' };
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    await this.findOne(id, user);

    await this.prisma.vehicle.update({
        where: { id },
        data: { deletedAt: new Date() },
    });
  }

  private buildFilters(filters: Omit<QueryVehicleDto, 'page' | 'limit' | 'orderBy' | 'order'>) {
  const where: Prisma.VehicleWhereInput = {};

  if (filters.search) {
    const searchVal = filters.search.trim();
    where.OR = [
      { plate: { contains: searchVal.replace(/-/g, '').toUpperCase(), mode: 'insensitive' } },
      { brand: { contains: searchVal, mode: 'insensitive' } },
      { model: { contains: searchVal, mode: 'insensitive' } },
    ];
  }

  if (filters.vehicleType) {
    where.vehicleType = { in: filters.vehicleType };
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.companyId) {
    where.companyId = filters.companyId;
  }

  return where;
}

  private async ensurePlateIsAvailable(
    plate: string,
    companyId: string,
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        plate,
        companyId,
        deletedAt: null,
        ...(ignoreId && { id: { not: ignoreId } }),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe um veículo cadastrado com esta placa para esta empresa',
      );
    }
  }
}
