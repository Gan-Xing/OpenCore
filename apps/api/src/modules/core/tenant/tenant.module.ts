import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { TenantFoundationController } from './tenant.controller';
import { TenantFoundationService } from './tenant.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantFoundationController],
  providers: [TenantFoundationService],
})
export class TenantFoundationModule {}
