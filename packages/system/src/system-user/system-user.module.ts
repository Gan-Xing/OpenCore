import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaSystemUserRepository } from './system-user.prisma-repository';
import { SystemUserRepository } from './system-user.repository';
import { SystemUserService } from './system-user.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SystemUserRepository,
      useClass: PrismaSystemUserRepository,
    },
    SystemUserService,
  ],
  exports: [SystemUserRepository, SystemUserService],
})
export class SystemUserModule {}
