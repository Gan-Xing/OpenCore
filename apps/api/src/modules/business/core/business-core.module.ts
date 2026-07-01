import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { BusinessCoreController } from './business-core.controller';
import { BusinessRepository } from './business.repository';
import { PrismaBusinessRepository } from './prisma-business.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessCoreController],
  providers: [
    {
      provide: BusinessRepository,
      useClass: PrismaBusinessRepository,
    },
  ],
  exports: [BusinessRepository],
})
export class BusinessCoreModule {}
