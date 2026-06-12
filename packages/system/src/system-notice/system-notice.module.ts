import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaSystemNoticeRepository } from './system-notice.prisma-repository';
import { SystemNoticeRepository } from './system-notice.repository';
import { SystemNoticeService } from './system-notice.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SystemNoticeRepository,
      useClass: PrismaSystemNoticeRepository,
    },
    SystemNoticeService,
  ],
  exports: [SystemNoticeRepository, SystemNoticeService],
})
export class SystemNoticeModule {}
