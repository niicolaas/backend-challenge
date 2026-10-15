import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const createRefuelingSchema = z.object({
    date: z.coerce.date({ message: 'Data inválida' }),
    liters: z.number().positive({ message: 'O valor de litros deve ser maior que zero' }),
    totalSpent: z.number().positive({ message: 'O valor total gasto deve ser maior que zero' }),
    odometer: z.number().int().nonnegative({ message: 'O hodômetro deve ser um número inteiro válido' }),
})

export class CreateRefuelingDto extends createZodDto(createRefuelingSchema) {}