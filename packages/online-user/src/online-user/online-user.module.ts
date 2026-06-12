import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
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
    OnlineUserService,
  ],
  exports: [OnlineUserRepository, OnlineUserService],
})
export class OnlineUserModule {}
