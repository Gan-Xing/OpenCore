import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaSystemMenuRepository } from './system-menu.prisma-repository';
import { SystemMenuRepository } from './system-menu.repository';
import { SystemMenuService } from './system-menu.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SystemMenuRepository,
      useClass: PrismaSystemMenuRepository,
    },
    SystemMenuService,
  ],
  exports: [SystemMenuRepository, SystemMenuService],
})
export class SystemMenuModule {}
