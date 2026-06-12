import {
  DynamicModule,
  FactoryProvider,
  Module,
  Provider,
} from '@nestjs/common';
import {
  REDIS_OPTIONS,
  readRedisOptionsFromEnv,
  type RedisOptionsConfig,
} from './redis-options';
import { RedisService } from './redis.service';

export type RedisModuleAsyncOptions = {
  inject?: FactoryProvider<RedisOptionsConfig>['inject'];
  useFactory: FactoryProvider<RedisOptionsConfig>['useFactory'];
};

@Module({
  providers: [
    createDefaultRedisOptionsProvider(),
    createRedisServiceProvider(),
  ],
  exports: [RedisService],
})
export class RedisModule {
  static forRoot(options: RedisOptionsConfig): DynamicModule {
    return createRedisDynamicModule({
      provide: REDIS_OPTIONS,
      useValue: options,
    });
  }

  static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    return createRedisDynamicModule({
      provide: REDIS_OPTIONS,
      inject: options.inject,
      useFactory: options.useFactory,
    });
  }
}

function createRedisDynamicModule(optionsProvider: Provider): DynamicModule {
  return {
    module: RedisModule,
    providers: [optionsProvider, createRedisServiceProvider()],
    exports: [RedisService],
  };
}

export function createDefaultRedisOptionsProvider(): Provider {
  return {
    provide: REDIS_OPTIONS,
    useFactory: () => readRedisOptionsFromEnv(),
  };
}

function createRedisServiceProvider(): Provider {
  return {
    provide: RedisService,
    inject: [REDIS_OPTIONS],
    useFactory: (options: RedisOptionsConfig) => new RedisService(options),
  };
}
