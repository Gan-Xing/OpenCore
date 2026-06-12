import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaSystemDictRepository } from './system-dict.prisma-repository';
import { SystemDictRepository } from './system-dict.repository';
import { SystemDictService } from './system-dict.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SystemDictRepository,
      useClass: PrismaSystemDictRepository,
    },
    SystemDictService,
  ],
  exports: [SystemDictRepository, SystemDictService],
})
export class SystemDictModule {}
