import { Module } from '@nestjs/common';
import { ToolingController } from './tooling.controller';
import { ToolingRepository } from './tooling.repository';

@Module({
  controllers: [ToolingController],
  providers: [ToolingRepository],
})
export class ToolingModule {}
