import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaSystemDeptRepository } from './system-dept.prisma-repository';
import { SystemDeptRepository } from './system-dept.repository';
import { SystemDeptService } from './system-dept.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SystemDeptRepository,
      useClass: PrismaSystemDeptRepository,
    },
    SystemDeptService,
  ],
  exports: [SystemDeptRepository, SystemDeptService],
})
export class SystemDeptModule {}
