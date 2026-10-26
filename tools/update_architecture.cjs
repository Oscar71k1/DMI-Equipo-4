const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const process = require('node:process');
const root = process.cwd();
const files = [path.join(root, 'App.tsx')];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'course-evaluation') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(file) && !file.endsWith('.d.ts')) files.push(file);
  }
}
walk(path.join(root, 'src'));
const rel = p => path.relative(root, p).split(path.sep).join('/');
const edges = new Set();
const nodes = new Set(files.map(rel));
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(n) {
    let spec;
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      spec = n.moduleSpecifier.text;
    } else if (ts.isCallExpression(n) && n.arguments.length === 1 && ts.isStringLiteral(n.arguments[0]) &&
      (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
      spec = n.arguments[0].text;
    }
    if (spec?.startsWith('.')) {
      const raw = path.resolve(path.dirname(file), spec);
      const target = [raw, raw + '.ts', raw + '.tsx', path.join(raw, 'index.ts'), path.join(raw, 'index.tsx')]
        .find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      if (target) { nodes.add(rel(target)); edges.add(rel(file) + ' -> ' + rel(target)); }
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
}
const id = p => 'F_' + p.replace(/[^a-zA-Z0-9]/g, '_');
const lines = ['flowchart TD', '  %% Imports internos del código; regenerar: node tools/update_architecture.cjs'];
for (const layer of ['ui', 'application', 'domain', 'infrastructure', 'composition', 'course-evaluation']) {
  const group = [...nodes].filter(p => {
    const kind = p === 'App.tsx' ? 'ui' : p.startsWith('src/api/') ? 'infrastructure' :
      p.startsWith('src/campusops/') ? 'domain' : p.split('/')[1];
    return kind === layer;
  }).sort();
  lines.push('  subgraph ' + layer.replace('-', '_') + '["' + layer + '"]');
  group.forEach(p => lines.push('    ' + id(p) + '["' + p + '"]'));
  lines.push('  end');
}
[...edges].sort().forEach(edge => {
  const [from, to] = edge.split(' -> ');
  lines.push('  ' + id(from) + ' --> ' + id(to));
});
fs.writeFileSync(path.join(root, 'docs/architecture.mmd'), lines.join('\n') + '\n');
