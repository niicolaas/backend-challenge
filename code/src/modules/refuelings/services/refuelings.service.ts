import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AbilityFactory } from "src/modules/ability/ability.factory";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateRefuelingDto } from "../dtos/create-refueling.dto";
import { AuthUser } from "src/common/interfaces/auth-user.interface";
import { accessibleBy } from "@casl/prisma/runtime";
import { QueryRefuelingDto } from "../dtos/query-refueling.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class RefuelingsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly abilityFactory: AbilityFactory,
    ) {}

    async create(vehicleId: string, data: CreateRefuelingDto, user: AuthUser) {
        const ability = this.abilityFactory.createForUser(user);

        const vehicle = await this.prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                deletedAt: null,
                AND: [accessibleBy(ability, 'read').Vehicle],
            },
        });

        if(!vehicle) {
            throw new NotFoundException(`Veículo com ID ${vehicleId} não encontrado`);
        }

        if(!vehicle.isActive) {
            throw new BadRequestException(`Veículo com ID ${vehicleId} está inativo`);
        }

        const previousRefueling = await this.prisma.refueling.findFirst({
            where: {
                vehicleId,
                date: { lte: data.date },
            },
            orderBy: [{ date: 'desc', }, { createdAt: 'desc' }],
        });

        if(previousRefueling && data.odometer < previousRefueling.odometer) {
            throw new BadRequestException(`O hodômetro deve ser maior que o do abastecimento anterior (${previousRefueling.odometer} km)`);
        }

        const nextRefueling = await this.prisma.refueling.findFirst({
            where: {
                vehicleId,
                date: { gte: data.date },
            },
            orderBy: [{ date: 'asc', }, { createdAt: 'asc' }],
        });

        if(nextRefueling && data.odometer >= nextRefueling.odometer) {
            throw new BadRequestException(`O hodômetro deve ser menor que o do próximo abastecimento (${nextRefueling.odometer} km)`);
        }

        const refueling = await this.prisma.refueling.create({
            data: {
                ...data,
                vehicleId,
            },
            select: {
                id: true,
            },
        });

        return { id: refueling.id, message: 'Abastecimento criado com sucesso' }
    }

    async findAll(vehicleId: string, params: QueryRefuelingDto, user: AuthUser) { 
        const ability = this.abilityFactory.createForUser(user);

        const vehicle = await this.prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                deletedAt: null,
                AND: [accessibleBy(ability, 'read').Vehicle],
            },
            select: { id: true },
        });

        if(!vehicle) {
            throw new NotFoundException(`Veículo com ID ${vehicleId} não encontrado`);
        }

        const { page, limit, orderBy, order } = params;
        const skip = (page - 1) * limit;

        const where: Prisma.RefuelingWhereInput = {
            vehicleId,
            AND: [accessibleBy(ability, 'read').Refueling],
        };

        const [refuelings, total] = await Promise.all([
            this.prisma.refueling.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [orderBy]: order },
                select: {
                    id: true,
                    date: true,
                    liters: true,
                    totalSpent: true,
                    odometer: true,
                    vehicleId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.refueling.count({ where }),
        ]);

        return {
            data: refuelings,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        }
    }

    async getConsumption(vehicleId: string, startDate: string, endDate: string, user: AuthUser) {
        const ability = this.abilityFactory.createForUser(user);

        const vehicle = await this.prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                deletedAt: null,
                AND: [accessibleBy(ability, 'read').Vehicle],
            },
            select: { id: true, plate: true },
        });

        if(!vehicle) {
            throw new NotFoundException(`Veículo com ID ${vehicleId} não encontrado`);
        }

        const refuelings = await this.prisma.refueling.findMany({
            where: {
                vehicleId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
                AND: [accessibleBy(ability, 'read').Refueling],
            },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        });

        if(refuelings.length < 2) {
            throw new BadRequestException(`São necessários pelo menos dois abastecimentos no período especificado para calcular o relatório de consumo.`);
        }

        const firstRefueling = refuelings[0];
        const lastRefueling = refuelings[refuelings.length - 1];

        const totalKm = lastRefueling.odometer - firstRefueling.odometer;

        let totalLiters = 0;
        let totalSpent = 0;

        for (let i = 1; i < refuelings.length; i++) {
            totalLiters += refuelings[i].liters;
            totalSpent += refuelings[i].totalSpent;
        }

        const averageKmPerLiter = totalLiters > 0 ? totalKm / totalLiters : 0;
        const averageCostPerKm = totalKm > 0 ? totalSpent / totalKm : 0;

        return {
            vehicleId,
            plate: vehicle.plate,
            period: { startDate, endDate },
            totalKm,
            totalLiters,
            totalSpent: Number(totalSpent.toFixed(2)),
            averageKmPerLiter: Number(averageKmPerLiter.toFixed(2)),
            averageCostPerKm: Number(averageCostPerKm.toFixed(2)),
        };
    }
}