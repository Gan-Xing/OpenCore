import { SystemManagementController } from './system-management.controller';

describe('SystemManagementController error codes', () => {
  it('returns stable error codes for controller-level validation', async () => {
    const controller = createController();

    await expectHttpExceptionCode(
      () => controller.lookupIpLocation({} as never),
      'SYSTEM_IP_ADDRESS_REQUIRED',
    );
    await expectHttpExceptionCode(
      () => controller.listNoticeInbox({} as never, {} as never),
      'SYSTEM_AUTH_USER_REQUIRED',
    );
    await expectHttpExceptionCode(
      () =>
        controller.uploadFileAsset({
          contentBase64: 'not-base64!',
          mimeType: 'text/plain',
          originalName: 'bad.txt',
          uploadedBy: 'admin',
        }),
      'SYSTEM_FILE_CONTENT_BASE64_INVALID',
    );
    await expectHttpExceptionCode(
      () =>
        controller.uploadFileAsset({
          contentBase64: 'A',
          mimeType: 'text/plain',
          originalName: 'empty.txt',
          uploadedBy: 'admin',
        }),
      'SYSTEM_FILE_CONTENT_EMPTY',
    );
  });

  it('returns a stable error code when stored file bytes are missing', async () => {
    const controller = createController({
      files: {
        getObject: jest.fn().mockResolvedValue(undefined),
      },
      repository: {
        getFile: jest.fn().mockResolvedValue({
          id: 'file_1',
          mimeType: 'text/plain',
          originalName: 'missing.txt',
          storageKey: 'runtime/file-assets/missing.txt',
        }),
      },
    });

    await expectHttpExceptionCode(
      () =>
        controller.downloadFile('file_1', {
          send: jest.fn(),
          set: jest.fn(),
        }),
      'SYSTEM_FILE_OBJECT_NOT_FOUND',
    );
  });
});

function createController(
  overrides: {
    files?: unknown;
    repository?: unknown;
  } = {},
): SystemManagementController {
  const empty = {} as never;

  return new SystemManagementController(
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    empty,
    (overrides.repository ?? empty) as never,
    (overrides.files ?? empty) as never,
  );
}

async function expectHttpExceptionCode(
  action: () => Promise<unknown> | unknown,
  code: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}
