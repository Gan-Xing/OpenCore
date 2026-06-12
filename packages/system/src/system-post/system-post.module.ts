import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaSystemPostRepository } from './system-post.prisma-repository';
import { SystemPostRepository } from './system-post.repository';
import { SystemPostService } from './system-post.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SystemPostRepository,
      useClass: PrismaSystemPostRepository,
    },
    SystemPostService,
  ],
  exports: [SystemPostRepository, SystemPostService],
})
export class SystemPostModule {}
