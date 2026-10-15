import { createZodDto } from "nestjs-zod";
import { createVehicleSchema } from "./create-vehicle.dto";

export const updateVehicleSchema = createVehicleSchema.partial();

export class UpdateVehicleDto extends createZodDto(updateVehicleSchema) {}