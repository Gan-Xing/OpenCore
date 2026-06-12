import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { CollaborationController } from './collaboration.controller';
import { CollaborationRepository } from './collaboration.repository';
import { PrismaCollaborationRepository } from './prisma-collaboration.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [CollaborationController],
  providers: [
    {
      provide: CollaborationRepository,
      useClass: PrismaCollaborationRepository,
    },
  ],
  exports: [CollaborationRepository],
})
export class CollaborationModule {}
