import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { SystemAreaController } from './system-area.controller';
import { ToolingController } from './tooling.controller';
import { ToolingRepository } from './tooling.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [SystemAreaController, ToolingController],
  providers: [ToolingRepository],
})
export class ToolingModule {}
