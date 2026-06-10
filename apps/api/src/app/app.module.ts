import { Module } from '@nestjs/common';
import { RbacModule } from '../modules/core/rbac/rbac.module';
import { HealthController } from './health.controller';

@Module({
  imports: [RbacModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
