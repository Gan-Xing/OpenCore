import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../platform/database/database.module';
import { OperationsController } from './operations.controller';
import { OperationsRepository } from './operations.repository';
import { PrismaOperationsRepository } from './prisma-operations.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [OperationsController],
  providers: [
    {
      provide: OperationsRepository,
      useClass: PrismaOperationsRepository,
    },
  ],
  exports: [OperationsRepository],
})
export class OperationsModule {}
