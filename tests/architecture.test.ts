import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as ts from 'typescript';

/**
 * Prueba basica de arquitectura para CampusOps.
 * Analiza los imports reales del proyecto (no busca texto) y detecta
 * dependencias que violan los limites acordados en el ADR.
 *
 * Alcance del detector (documentado a proposito, no es un analizador universal):
 * - Cubre imports estaticos (`import ... from '...'`), reexportaciones
 *   (`export ... from '...'`), `require('...')` y `import('...')` dinamico
 *   con ruta literal (string).
 * - Resuelve rutas relativas, archivos `index` y extensiones .ts/.tsx.
 * - No resuelve alias de tsconfig porque este proyecto no usa alias.
 * - Excluye node_modules, pruebas, generado y el harness del curso.
 */

type Layer =
  | 'ui'
  | 'application'
  | 'domain'
  | 'infrastructure'
  | 'composition'
  | 'unclassified';

const PROJECT_ROOT = path.resolve(__dirname, '..');

const EXCLUDED_DIR_SEGMENTS = [
  'node_modules',
  'course-tests',
  'course-backend',
  'course-evaluation',
  '.jest-cache',
  'dist',
  'android',
  'tests',
];

function isExcluded(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  return EXCLUDED_DIR_SEGMENTS.some((seg) => parts.includes(seg));
}

function listSourceFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (isExcluded(fullPath)) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }

  const appTsx = path.join(rootDir, 'App.tsx');
  if (fs.existsSync(appTsx)) results.push(appTsx);

  const srcDir = path.join(rootDir, 'src');
  if (fs.existsSync(srcDir)) walk(srcDir);

  return results;
}

type ImportRecord = {
  specifier: string;
  kind: 'import' | 'reexport' | 'require' | 'dynamic-import';
};

function extractImports(filePath: string): ImportRecord[] {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const imports: ImportRecord[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({ specifier: node.moduleSpecifier.text, kind: 'import' });
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({ specifier: node.moduleSpecifier.text, kind: 'reexport' });
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({ specifier: (node.arguments[0] as ts.StringLiteral).text, kind: 'require' });
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({ specifier: (node.arguments[0] as ts.StringLiteral).text, kind: 'dynamic-import' });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

function resolveInternal(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;

  const baseDir = path.dirname(fromFile);
  const raw = path.resolve(baseDir, specifier);

  const candidates = [
    raw,
    `${raw}.ts`,
    `${raw}.tsx`,
    path.join(raw, 'index.ts'),
    path.join(raw, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function toRelative(filePath: string, root: string): string {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function classifyLayer(filePath: string, root: string): Layer {
  const rel = toRelative(filePath, root);

  if (rel === 'App.tsx') return 'ui';
  if (rel === 'src/campusops/contracts.ts') return 'domain';
  if (rel.startsWith('src/ui/')) return 'ui';
  if (rel.startsWith('src/application/')) return 'application';
  if (rel.startsWith('src/domain/')) return 'domain';
  if (rel.startsWith('src/composition/')) return 'composition';
  if (rel.startsWith('src/infrastructure/')) return 'infrastructure';
  if (rel.startsWith('src/api/')) return 'infrastructure';

  return 'unclassified';
}

type Edge = {
  from: string;
  fromLayer: Layer;
  to: string;
  toLayer: Layer | 'external';
  kind: ImportRecord['kind'];
};

type Violation = Edge & { rule: string };

function scanArchitecture(rootDir: string): { edges: Edge[]; violations: Violation[] } {
  const files = listSourceFiles(rootDir);
  const edges: Edge[] = [];
  const violations: Violation[] = [];

  for (const file of files) {
    const fromLayer = classifyLayer(file, rootDir);
    const imports = extractImports(file);

    for (const imp of imports) {
      const resolved = resolveInternal(file, imp.specifier);
      const toLayer: Layer | 'external' = resolved ? classifyLayer(resolved, rootDir) : 'external';
      const toLabel = resolved ? toRelative(resolved, rootDir) : `external:${imp.specifier}`;

      const edge: Edge = {
        from: toRelative(file, rootDir),
        fromLayer,
        to: toLabel,
        toLayer,
        kind: imp.kind,
      };
      edges.push(edge);

      if (fromLayer === 'ui' && toLayer === 'infrastructure') {
        violations.push({
          ...edge,
          rule: 'UI no debe depender de infrastructure directamente (debe pasar por application).',
        });
      }

      if (fromLayer === 'application' && toLayer === 'infrastructure') {
        violations.push({
          ...edge,
          rule: 'application no debe depender de una implementacion concreta de infrastructure (usar el puerto de domain).',
        });
      }

      if (fromLayer === 'domain' && toLayer !== 'domain') {
        violations.push({
          ...edge,
          rule: 'domain no debe importar UI, application, infrastructure ni paquetes externos (React, Expo, HTTP, almacenamiento).',
        });
      }

      if (fromLayer === 'ui' && toLayer === 'composition' && toRelative(file, rootDir) !== 'App.tsx') {
        violations.push({
          ...edge,
          rule: 'Una pantalla no debe importar composition directamente; solo App.tsx puede hacerlo para el montaje.',
        });
      }
    }
  }

  return { edges, violations };
}

describe('arquitectura: limites entre capas', () => {
  test('el detector reconoce una violacion fabricada en un fixture temporal', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-fixture-'));
    const srcDir = path.join(tmpRoot, 'src');
    fs.mkdirSync(path.join(srcDir, 'ui'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'infrastructure'), { recursive: true });

    fs.writeFileSync(
      path.join(srcDir, 'infrastructure', 'fakeClient.ts'),
      'export function fakeClient() { return true; }\n'
    );
    fs.writeFileSync(
      path.join(srcDir, 'ui', 'Screen.tsx'),
      "import { fakeClient } from '../infrastructure/fakeClient';\nexport function Screen() { return fakeClient(); }\n"
    );

    const { violations } = scanArchitecture(tmpRoot);
    fs.rmSync(tmpRoot, { recursive: true, force: true });

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].rule).toContain('UI no debe depender de infrastructure');
  });

  test('el codigo real del proyecto no debe tener importaciones prohibidas entre capas', () => {
    const { edges, violations } = scanArchitecture(PROJECT_ROOT);

    if (violations.length > 0) {
      const detail = violations
        .map((v) => `  - ${v.from} -> ${v.to} [${v.rule}]`)
        .join('\n');
      // eslint-disable-next-line no-console
      console.log(`Dependencias inspeccionadas: ${edges.length}`);
      // eslint-disable-next-line no-console
      console.log(`Violaciones encontradas:\n${detail}`);
    }

    expect(violations).toEqual([]);
  });
});

export { scanArchitecture, classifyLayer, PROJECT_ROOT };