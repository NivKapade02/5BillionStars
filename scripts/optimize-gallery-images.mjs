import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gallery = path.join(root, 'public/images/gallery/collection');
const reportPath = path.join(root, 'tmp/media-optimization/gallery-webp.json');
let prior = {};
try { prior = JSON.parse(await fs.readFile(reportPath, 'utf8')).files; } catch {}
const files = {};
for (const directory of ['display', 'thumbs']) {
  for (const filename of await fs.readdir(path.join(gallery, directory))) {
    if (!/^photo-\d+\.jpg$/.test(filename)) continue;
    const source = path.join(gallery, directory, filename);
    const bytes = await fs.readFile(source);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const stem = filename.replace(/\.jpg$/, '');
    const outputs = directory === 'display'
      ? [{ name: stem + '.webp', width: 1600 }, { name: stem + '-800.webp', width: 800 }]
      : [{ name: stem + '.webp', width: 320 }];
    for (const output of outputs) {
      const destination = path.join(gallery, directory, output.name);
      const key = directory + '/' + output.name;
      let exists = false;
      try { await fs.access(destination); exists = true; } catch {}
      if (prior[key]?.hash !== hash || !exists) {
        await sharp(bytes).rotate().resize({ width: output.width, height: output.width, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80, effort: 5 }).toFile(destination);
      }
      await sharp(destination).metadata();
      files[key] = { hash, originalBytes: bytes.length, bytes: (await fs.stat(destination)).size };
    }
  }
}
// Use modern delivery formats for the above-the-fold banner and stay photos too.
for (const directory of ['banner', 'stay-options']) {
  const folder = path.join(root, 'public/images', directory);
  for (const filename of await fs.readdir(folder)) {
    if (!/\.jpe?g$/i.test(filename)) continue;
    const bytes = await fs.readFile(path.join(folder, filename));
    const destination = path.join(folder, filename.replace(/\.jpe?g$/i, '.webp'));
    const hash = createHash('sha256').update(bytes).digest('hex');
    const key = directory + '/' + path.basename(destination);
    let exists = false;
    try { await fs.access(destination); exists = true; } catch {}
    if (prior[key]?.hash !== hash || !exists) {
      await sharp(bytes).rotate().resize({ width: directory === 'banner' ? 1920 : 1200, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 }).toFile(destination);
    }
    await sharp(destination).metadata();
    files[key] = { hash, originalBytes: bytes.length, bytes: (await fs.stat(destination)).size };
  }
}
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, JSON.stringify({ files }, null, 2));
const full = Object.entries(files).filter(([name]) => !name.endsWith('-800.webp'));
console.log(JSON.stringify({ generated: Object.keys(files).length,
  originalBytes: full.reduce((sum, [, f]) => sum + f.originalBytes, 0),
  webpBytes: full.reduce((sum, [, f]) => sum + f.bytes, 0) }));
