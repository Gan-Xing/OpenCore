import { readOpenApiSnapshot } from './openapi-reader';
import { readModuleRegistrySnapshot } from './registry-reader';
import { loadManualSchema } from './schema-loader';

describe('OpenForge readonly readers', () => {
  it('reads module registry metadata without mutating it', () => {
    const snapshot = readModuleRegistrySnapshot();

    expect(snapshot.validation.valid).toBe(true);
    expect(
      snapshot.modules.map((moduleDefinition) => moduleDefinition.code),
    ).toEqual(expect.arrayContaining(['core.dict', 'tool.openforge']));
    expect(snapshot.permissions.map((permission) => permission.code)).toEqual(
      expect.arrayContaining(['core:dict:read', 'tool:openforge:manage']),
    );
    expect(snapshot.menus.map((menu) => menu.key)).toEqual(
      expect.arrayContaining(['system.dicts', 'tools.openforge']),
    );
  });

  it('reads OpenAPI paths, operations, tags, and schemas', () => {
    const snapshot = readOpenApiSnapshot();

    expect(snapshot.paths).toEqual(expect.arrayContaining(['/api/core/dicts']));
    expect(snapshot.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/api/core/dicts',
          method: 'get',
          operationId: 'SystemManagementController_listDicts',
        }),
      ]),
    );
    expect(snapshot.tags).toEqual(
      expect.arrayContaining(['Core System Management']),
    );
    expect(snapshot.schemas).toEqual(expect.arrayContaining(['DictTypeDto']));
  });

  it('loads the core dictionary manual schema fixture', () => {
    const loaded = loadManualSchema(
      'tools/generator/examples/core.dict.schema.json',
    );

    expect(loaded.schema).toMatchObject({
      moduleCode: 'core.dict',
      resource: 'dict',
      title: 'Dictionaries',
    });
    expect(loaded.schema.permissions).toEqual(
      expect.arrayContaining(['core:dict:read']),
    );
  });
});
