import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { RefuelingsService } from "../services/refuelings.service";
import { Can } from "src/common/decorators/can.decorator";
import { CreateRefuelingDto } from "../dtos/create-refueling.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { AuthUser } from "src/common/interfaces/auth-user.interface";
import { QueryRefuelingDto } from "../dtos/query-refueling.dto";

@Controller('vehicles/:id')
export class RefuelingsController {
    constructor(private readonly refuelingsService: RefuelingsService) {}

    @Can('create', 'Refueling')
    @Post('refuelings')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('id') vehicleId: string,
        @Body() createRefuelingDto: CreateRefuelingDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.refuelingsService.create(vehicleId, createRefuelingDto, user);
    }

    @Can('read', 'Refueling')
    @Get('refuelings')
    async findAll(
        @Param('id') vehicleId: string,
        @Query() query: QueryRefuelingDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.refuelingsService.findAll(vehicleId, query, user);
    }

    @Can('read', 'Refueling')
    @Get('consumption')
    async getConsumption(
        @Param('id') vehicleId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.refuelingsService.getConsumption(vehicleId, startDate, endDate, user); 
    }
}