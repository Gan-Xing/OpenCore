import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { BusinessCommerceController } from './commerce.controller';
import { BusinessCommerceRepository } from './commerce.repository';
import { PrismaCommerceRepository } from './prisma-commerce.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessCommerceController],
  providers: [
    {
      provide: BusinessCommerceRepository,
      useClass: PrismaCommerceRepository,
    },
  ],
  exports: [BusinessCommerceRepository],
})
export class BusinessCommerceModule {}
