import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../platform/database/database.module';
import { IntegrationController } from './integration.controller';
import { IntegrationRepository } from './integration.repository';
import { PrismaIntegrationRepository } from './prisma-integration.repository';

@Module({
  imports: [DatabaseModule],
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
