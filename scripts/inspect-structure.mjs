import { parse } from 'node-html-parser';
import { readFileSync } from 'node:fs';

for (const f of process.argv.slice(2)) {
  const root = parse(readFileSync(f, 'utf8'));
  const body = root.querySelector('body');
  console.log(`\n=== ${f} :: body class="${body.getAttribute('class') || ''}" ===`);
  const walk = (node, depth) => {
    for (const c of node.childNodes) {
      if (c.nodeType !== 1) continue;
      const cls = c.getAttribute('class') || '';
      console.log('  '.repeat(depth) + `<${c.rawTagName} class="${cls}">`);
      if (depth < 1) walk(c, depth + 1);
    }
  };
  walk(body, 0);
}
