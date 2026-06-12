import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaSystemConfigRepository } from './system-config.prisma-repository';
import { SystemConfigRepository } from './system-config.repository';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SystemConfigRepository,
      useClass: PrismaSystemConfigRepository,
    },
    SystemConfigService,
  ],
  exports: [SystemConfigRepository, SystemConfigService],
})
export class SystemConfigModule {}
