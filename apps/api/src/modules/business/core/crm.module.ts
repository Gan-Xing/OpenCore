import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { CrmController } from './crm.controller';
import { CrmRepository } from './crm.repository';
import { PrismaCrmRepository } from './prisma-crm.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [CrmController],
  providers: [
    {
      provide: CrmRepository,
      useClass: PrismaCrmRepository,
    },
  ],
  exports: [CrmRepository],
})
export class CrmModule {}
