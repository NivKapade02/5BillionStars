import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'tmp/media-optimization');
const manifestPath = path.join(cache, 'report.json');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const images = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const videos = new Set(['.mp4', '.mov', '.webm']);
const verify = process.argv.includes('--verify');
const imagesOnly = process.argv.includes('--images-only');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
let prior = {};
try { prior = JSON.parse(await fs.readFile(manifestPath, 'utf8')).files; } catch {}
const files = { ...prior };
await fs.mkdir(cache, { recursive: true });

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(name));
    else if (images.has(path.extname(name).toLowerCase()) || videos.has(path.extname(name).toLowerCase())) result.push(name);
  }
  return result;
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-8000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr)));
  });
}

// Some original gallery .jpg files contain Canon RAW data with an embedded JPEG.
function embeddedJpeg(bytes) {
  let best;
  for (let start = 0; start < bytes.length - 3; start++) {
    if (bytes[start] !== 255 || bytes[start + 1] !== 216 || bytes[start + 2] !== 255) continue;
    let supported = false;
    for (let marker = start + 3; marker < bytes.length - 4; marker++) {
      if (bytes[marker] !== 255) continue;
      if ((bytes[marker + 1] === 192 || bytes[marker + 1] === 194) && bytes[marker + 4] === 8) supported = true;
      if (bytes[marker + 1] === 218 || bytes[marker + 1] === 217) break;
    }
    if (!supported) continue;
    const end = bytes.indexOf(Buffer.from([255, 217]), start + 3);
    if (end > start && (!best || end + 2 - start > best.length)) best = bytes.subarray(start, end + 2);
  }
  if (!best) throw new Error('No embedded JPEG in RAW image');
  return best;
}

function limit(name) {
  if (name.includes('/thumbs/')) return 320;
  if (name.includes('/nearplaces/')) return 900;
  if (name.includes('/restaurant/')) return 800;
  if (name.includes('/games/')) return 800;
  if (name.includes('/banner/')) return 1920;
  return 1600;
}

async function imageCandidate(bytes, ext, name) {
  let input = bytes;
  if (bytes[0] === 73 && bytes[1] === 73 && bytes[8] === 67 && bytes[9] === 82) input = embeddedJpeg(bytes);
  let pipeline = sharp(input, { animated: true }).rotate().resize({
    width: limit(name), height: limit(name), fit: 'inside', withoutEnlargement: true
  });
  if (ext === '.jpg' || ext === '.jpeg') pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  else if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9, effort: 10 });
  else if (ext === '.webp') pipeline = pipeline.webp({ quality: 82, effort: 5 });
  else pipeline = pipeline.avif({ quality: 55, effort: 5 });
  return pipeline.toBuffer();
}

const targets = [...await walk(path.join(root, 'public')), ...await walk(path.join(root, 'src/assets'))];
let failures = 0;
let changed = 0;
for (const target of targets) {
  const name = path.relative(root, target).replaceAll('\\', '/');
  const ext = path.extname(target).toLowerCase();
  if (imagesOnly && videos.has(ext)) continue;
  const bytes = await fs.readFile(target);
  const hash = digest(bytes);
  if (!verify && prior[name]?.hash === hash) continue;
  const temporary = path.join(cache, 'candidate' + ext);
  try {
    if (verify) {
      if (images.has(ext)) await sharp(bytes).stats();
      else await run(['-v', 'error', '-i', target, '-map', '0:v:0', '-map', '0:a?', '-f', 'null', '-']);
      continue;
    }
    let candidate;
    if (images.has(ext)) candidate = await imageCandidate(bytes, ext, name);
    else {
      console.log('Encoding ' + name);
      // Keep aspect ratio, cap either dimension at 1280 and use even H.264 dimensions.
      const scale = "scale=trunc(iw*min(1\\,min(1280/iw\\,1280/ih))/2)*2:trunc(ih*min(1\\,min(1280/iw\\,1280/ih))/2)*2";
      const encoding = ext === '.webm'
        ? ['-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-c:a', 'libopus', '-b:a', '96k']
        : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '25', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart'];
      await run(['-y', '-v', 'error', '-i', target, '-map', '0:v:0', '-map', '0:a?',
        '-vf', scale, ...encoding, '-pix_fmt', 'yuv420p', '-map_metadata', '-1', '-threads', '2', temporary]);
      candidate = await fs.readFile(temporary);
    }
    // Keep a byte-for-byte backup before replacing, and never enlarge an asset.
    const replace = candidate.length < bytes.length * 0.97;
    if (replace) {
      const backup = path.join(cache, 'originals', name);
      await fs.mkdir(path.dirname(backup), { recursive: true });
      try { await fs.copyFile(target, backup, 1); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      await fs.writeFile(target, candidate);
      changed++;
    }
    files[name] = { before: prior[name]?.before ?? bytes.length, after: replace ? candidate.length : bytes.length, hash: replace ? digest(candidate) : hash };
    if (replace) console.log(`${name}: ${bytes.length} -> ${candidate.length}`);
    // Save after each file so interrupted runs resume without re-encoding assets.
    await fs.writeFile(manifestPath, JSON.stringify({ files }, null, 2));
  } catch (error) {
    failures++;
    console.error(name + ': ' + error.message);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
const entries = Object.values(files);
const before = entries.reduce((sum, row) => sum + row.before, 0);
const after = entries.reduce((sum, row) => sum + row.after, 0);
console.log(JSON.stringify({ checked: targets.length, changed, failures, before, after, saved: before - after }));
if (failures) process.exitCode = 1;
