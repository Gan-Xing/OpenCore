import {
  DynamicModule,
  Module,
  type InjectionToken,
  type OptionalFactoryDependency,
  type Provider,
} from '@nestjs/common';
import {
  FILE_STORAGE_OPTIONS,
  readFileStorageOptionsFromEnv,
  type FileStorageOptions,
} from './file-options';
import { createFileStorageFromOptions } from './file-storage.factory';
import { FileStorageService } from './file.service';
import { FILE_STORAGE } from './storage';

export type FileModuleAsyncOptions = {
  imports?: DynamicModule['imports'];
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
  useFactory: (
    ...args: unknown[]
  ) => FileStorageOptions | Promise<FileStorageOptions>;
};

const defaultFileStorageOptionsProvider: Provider = {
  provide: FILE_STORAGE_OPTIONS,
  useFactory: readFileStorageOptionsFromEnv,
};

const fileStorageProvider: Provider = {
  provide: FILE_STORAGE,
  useFactory: createFileStorageFromOptions,
  inject: [FILE_STORAGE_OPTIONS],
};

@Module({
  providers: [
    defaultFileStorageOptionsProvider,
    fileStorageProvider,
    FileStorageService,
  ],
  exports: [FILE_STORAGE_OPTIONS, FILE_STORAGE, FileStorageService],
})
export class FileModule {
  static forRoot(options: FileStorageOptions): DynamicModule {
    return {
      module: FileModule,
      providers: [
        { provide: FILE_STORAGE_OPTIONS, useValue: options },
        fileStorageProvider,
        FileStorageService,
      ],
      exports: [FILE_STORAGE_OPTIONS, FILE_STORAGE, FileStorageService],
    };
  }

  static forRootAsync(options: FileModuleAsyncOptions): DynamicModule {
    return {
      module: FileModule,
      imports: options.imports,
      providers: [
        {
          provide: FILE_STORAGE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        fileStorageProvider,
        FileStorageService,
      ],
      exports: [FILE_STORAGE_OPTIONS, FILE_STORAGE, FileStorageService],
    };
  }
}
