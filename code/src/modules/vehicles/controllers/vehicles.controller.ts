import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { VehiclesService } from "../services/vehicles.services";
import { Can } from "src/common/decorators/can.decorator";
import { CreateVehicleDto } from "../dtos/create-vehicle.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { AuthUser } from "src/common/interfaces/auth-user.interface";
import { QueryVehicleDto } from "../dtos/query-vehicle.dto";
import { UpdateVehicleDto } from "../dtos/update-vehicle.dto";

@Controller('vehicles')
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) {}

    @Can('create', 'Vehicle')
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createVehicleDto: CreateVehicleDto, @CurrentUser() user: AuthUser) {
        return this.vehiclesService.create(createVehicleDto, user);
    }

    @Can('read', 'Vehicle')
    @Get()
    async findAll(@Query() query: QueryVehicleDto, @CurrentUser() user: AuthUser) {
        return this.vehiclesService.findAll(query, user);
    }

    @Can('read', 'Vehicle')
    @Get(':id')
    async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.vehiclesService.findOne(id, user);
    }

    @Can('update', 'Vehicle')
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateVehicleDto: UpdateVehicleDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.vehiclesService.update(id, updateVehicleDto, user);
    }

    @Can('delete', 'Vehicle')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        await this.vehiclesService.remove(id, user);
    }
}