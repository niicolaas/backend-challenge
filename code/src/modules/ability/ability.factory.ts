import { AbilityBuilder } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import { Role } from 'src/common/enums/role.enum';
import { AuthUser } from 'src/common/interfaces/auth-user.interface';
import { AppAbility } from './app.ability';

@Injectable()
export class AbilityFactory {
  createForUser(user: AuthUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    if (user.role === Role.ADMIN) {
      can('manage', 'all');
    } else if (user.companyId) {
      const companyId = user.companyId;

      can('read', 'Company', { id: companyId });

      if (user.role === Role.MANAGER) {
        can('manage', ['User', 'Vehicle'], { companyId });
        can('manage', 'Refueling', { vehicle: { companyId } });
      } else {
        can('read', ['User', 'Vehicle'], { companyId });
        can('read', 'Refueling', { vehicle: { companyId } });
      }
    }

    return build();
  }
}
