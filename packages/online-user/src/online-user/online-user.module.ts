import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { SecurityAuthSessionRepository } from '@opencore/security';
import { PrismaOnlineUserRepository } from './online-user.prisma-repository';
import { OnlineUserRepository } from './online-user.repository';
import { OnlineUserService } from './online-user.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: OnlineUserRepository,
      useClass: PrismaOnlineUserRepository,
    },
    {
      provide: SecurityAuthSessionRepository,
      useExisting: OnlineUserRepository,
    },
    OnlineUserService,
  ],
  exports: [
    OnlineUserRepository,
    SecurityAuthSessionRepository,
    OnlineUserService,
  ],
})
export class OnlineUserModule {}
