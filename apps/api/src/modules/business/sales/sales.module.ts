import { Module } from '@nestjs/common';
import { BusinessCoreModule } from '../core/business-core.module';
import { SalesController } from './sales.controller';

@Module({
  imports: [BusinessCoreModule],
  controllers: [SalesController],
})
export class SalesModule {}
