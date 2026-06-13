import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { SystemConfigModule } from '@opencore/system';
import { IntegrationController } from './integration.controller';
import { IntegrationRepository } from './integration.repository';
import { PrismaIntegrationRepository } from './prisma-integration.repository';

@Module({
  imports: [DatabaseModule, SystemConfigModule],
  controllers: [IntegrationController],
  providers: [
    {
      provide: IntegrationRepository,
      useClass: PrismaIntegrationRepository,
    },
  ],
  exports: [IntegrationRepository],
})
export class IntegrationModule {}
