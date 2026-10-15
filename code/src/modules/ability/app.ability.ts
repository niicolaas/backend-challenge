import { PureAbility } from '@casl/ability';
import { PrismaQuery, Subjects } from '@casl/prisma';

export type AppSubjects = Subjects<{
  Company: { id: string };
  User: { companyId: string | null };
  Vehicle: { companyId: string };
  Refueling: { vehicle: { companyId: string } };
}>;

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';

export type AppAbility = PureAbility<[Actions, AppSubjects | 'all'], PrismaQuery>;
