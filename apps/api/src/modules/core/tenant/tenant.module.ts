import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import {
  TenantFoundationController,
  TenantPlanController,
} from './tenant.controller';
import { TenantMemberController } from './tenant-member.controller';
import { TenantFoundationService } from './tenant.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    TenantFoundationController,
    TenantPlanController,
    TenantMemberController,
  ],
  providers: [TenantFoundationService],
})
export class TenantFoundationModule {}
