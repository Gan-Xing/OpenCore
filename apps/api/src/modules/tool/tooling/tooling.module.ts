import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { ToolingController } from './tooling.controller';
import { ToolingRepository } from './tooling.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [ToolingController],
  providers: [ToolingRepository],
})
export class ToolingModule {}
