import {
  DynamicModule,
  FactoryProvider,
  Module,
  Provider,
} from '@nestjs/common';
import {
  DATABASE_OPTIONS,
  readDatabaseOptionsFromEnv,
  type DatabaseOptions,
} from './database-options';
import { PrismaService } from './prisma.service';

export type DatabaseModuleAsyncOptions = {
  inject?: FactoryProvider<DatabaseOptions>['inject'];
  useFactory: FactoryProvider<DatabaseOptions>['useFactory'];
};

@Module({
  providers: [
    createDefaultDatabaseOptionsProvider(),
    createPrismaServiceProvider(),
  ],
  exports: [PrismaService],
})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return createDatabaseDynamicModule({
      provide: DATABASE_OPTIONS,
      useValue: options,
    });
  }

  static forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule {
    return createDatabaseDynamicModule({
      provide: DATABASE_OPTIONS,
      inject: options.inject,
      useFactory: options.useFactory,
    });
  }
}

function createDatabaseDynamicModule(optionsProvider: Provider): DynamicModule {
  return {
    module: DatabaseModule,
    providers: [optionsProvider, createPrismaServiceProvider()],
    exports: [PrismaService],
  };
}

export function createDefaultDatabaseOptionsProvider(): Provider {
  return {
    provide: DATABASE_OPTIONS,
    useFactory: () => readDatabaseOptionsFromEnv(),
  };
}

function createPrismaServiceProvider(): Provider {
  return {
    provide: PrismaService,
    inject: [DATABASE_OPTIONS],
    useFactory: (options: DatabaseOptions) => new PrismaService(options),
  };
}
