import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { VehicleType } from '../enums/vehicle-type.enum';

const currentYear = new Date().getFullYear();

export const createVehicleSchema = z.object({
  plate: z
    .string({ required_error: 'A placa é obrigatória' })
    .trim()
    .transform((val) => val.replace(/-/g, '').toUpperCase())
    .pipe(
      z
        .string()
        .min(7, { message: 'A placa deve ter no mínimo 7 caracteres' })
        .max(8, { message: 'A placa deve ter no máximo 8 caracteres' }),
    ),
  brand: z
    .string({ required_error: 'A marca é obrigatória' })
    .trim()
    .min(2, { message: 'A marca deve ter pelo menos 2 caracteres' })
    .max(50, { message: 'A marca deve ter no máximo 50 caracteres' }),
  model: z
    .string({ required_error: 'O modelo é obrigatório' })
    .trim()
    .min(2, { message: 'O modelo deve ter pelo menos 2 caracteres' })
    .max(50, { message: 'O modelo deve ter no máximo 50 caracteres' }),
  year: z
    .number({ required_error: 'O ano é obrigatório', invalid_type_error: 'O ano deve ser um número inteiro' })
    .int({ message: 'O ano deve ser um número inteiro' })
    .min(1950, { message: 'O ano mínimo permitido é 1950' })
    .max(currentYear + 1, { message: `O ano não pode exceder ${currentYear + 1}` }),
  vehicleType: z.nativeEnum(VehicleType, {
    required_error: 'O tipo de veículo é obrigatório',
    invalid_type_error: 'Tipo de veículo inválido',
  }),
  isActive: z.boolean({ invalid_type_error: 'isActive deve ser booleano' }).default(true),
  description: z
    .string()
    .trim()
    .max(255, { message: 'A descrição deve ter no máximo 255 caracteres' })
    .optional(),
  companyId: z.string().uuid({ message: 'ID da empresa inválido' }).optional(),
});

export class CreateVehicleDto extends createZodDto(createVehicleSchema) {}