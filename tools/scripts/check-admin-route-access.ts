import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listModules } from '@opencore/module-registry';
import ts from 'typescript';

const root = process.cwd();
const routesConfig = readFileSync(
  resolve(root, 'apps/admin/config/routes.ts'),
  'utf8',
);
const accessSource = readFileSync(
  resolve(root, 'apps/admin/src/access.ts'),
  'utf8',
);
const issues: string[] = [];

function getPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }

  return undefined;
}

function getStringProperty(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): string | undefined {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    if (getPropertyName(property.name) !== propertyName) {
      continue;
    }

    if (ts.isStringLiteral(property.initializer)) {
      return property.initializer.text;
    }
  }

  return undefined;
}

function collectRouteAccessBindings(sourceText: string): Map<string, string> {
  const sourceFile = ts.createSourceFile(
    'apps/admin/config/routes.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const bindings = new Map<string, string>();

  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const path = getStringProperty(node, 'path');
      const access = getStringProperty(node, 'access');

      if (path?.startsWith('/') && access) {
        bindings.set(path, access);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return bindings;
}

function collectAccessBindings(sourceText: string): Map<string, string> {
  const sourceFile = ts.createSourceFile(
    'apps/admin/src/access.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const bindings = new Map<string, string>();

  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      ['hasAnyPermission', 'hasPermission'].includes(
        node.initializer.expression.text,
      )
    ) {
      const accessKey = getPropertyName(node.name);

      if (accessKey) {
        for (const argument of node.initializer.arguments) {
          if (ts.isStringLiteral(argument) && !bindings.has(argument.text)) {
            bindings.set(argument.text, accessKey);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return bindings;
}

const routeAccessBindings = collectRouteAccessBindings(routesConfig);
const accessBindings = collectAccessBindings(accessSource);

for (const moduleDefinition of listModules()) {
  for (const route of moduleDefinition.admin?.routes ?? []) {
    if (!routesConfig.includes(`path: '${route.path}'`)) {
      issues.push(
        `missing-admin-route module=${moduleDefinition.code} path=${route.path}`,
      );
    }

    if (!route.permissionCode) {
      continue;
    }

    const expectedAccess = accessBindings.get(route.permissionCode);
    const actualAccess = routeAccessBindings.get(route.path);

    if (!expectedAccess) {
      issues.push(
        `missing-access-permission module=${moduleDefinition.code} permission=${route.permissionCode}`,
      );
      continue;
    }

    if (actualAccess !== expectedAccess) {
      issues.push(
        [
          `mismatched-admin-route-access module=${moduleDefinition.code}`,
          `path=${route.path}`,
          `permission=${route.permissionCode}`,
          `expectedAccess=${expectedAccess}`,
          `actualAccess=${actualAccess ?? 'missing'}`,
        ].join(' '),
      );
    }
  }
}

if (issues.length > 0) {
  throw new Error(`Admin route/access drift detected:\n${issues.join('\n')}`);
}

process.stdout.write('Admin route/access drift check is clean.\n');
