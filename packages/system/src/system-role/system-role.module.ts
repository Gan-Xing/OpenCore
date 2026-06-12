import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { SystemMenuModule } from '../system-menu/system-menu.module';
import { PrismaSystemRoleRepository } from './system-role.prisma-repository';
import { SystemRoleRepository } from './system-role.repository';
import { SystemRoleService } from './system-role.service';

@Module({
  imports: [DatabaseModule, SystemMenuModule],
  providers: [
    {
      provide: SystemRoleRepository,
      useClass: PrismaSystemRoleRepository,
    },
    SystemRoleService,
  ],
  exports: [SystemRoleRepository, SystemRoleService],
})
export class SystemRoleModule {}
