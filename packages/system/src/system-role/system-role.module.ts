import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaSystemRoleRepository } from './system-role.prisma-repository';
import { SystemRoleRepository } from './system-role.repository';
import { SystemRoleService } from './system-role.service';

@Module({
  imports: [DatabaseModule],
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
