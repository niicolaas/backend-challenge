import { booleanQueryParam, orderByField, paginationQuerySchema } from 'src/common/dtos/pagination-query.schema';
import z from 'zod';
import { VehicleType } from '../enums/vehicle-type.enum';
import { createZodDto } from 'nestjs-zod/dto';

export const queryVehicleSchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  vehicleType: z
    .preprocess(val => (Array.isArray(val) ? val : [val]), z.array(z.nativeEnum(VehicleType)))
    .optional(),
  isActive: booleanQueryParam('isActive'),
  companyId: z.string().uuid({ message: 'ID da empresa inválido' }).optional(),
  orderBy: orderByField(['plate', 'year', 'brand', 'createdAt']),
});

export class QueryVehicleDto extends createZodDto(queryVehicleSchema) {}
