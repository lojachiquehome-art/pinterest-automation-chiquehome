import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE =
  'C:/Users/Pichau/.codex/generated_images/019eec6c-4814-7af1-ba24-82c62ea97fb2/call_QatXInYRZZ1KRmLZYRDB5pu5.png';
const OUTPUT_DIR = path.join(ROOT, 'public', 'pinterest', 'generated');
const BATCH_PATH = path.join(ROOT, 'output', 'pins_batch.json');
const BASE_URL =
  process.env.PIN_IMAGE_BASE_URL ||
  'https://raw.githubusercontent.com/lojachiquehome-art/pinterest-automation-chiquehome/main/pinterest_automation/public/pinterest';

const pairsByDay = [
  [4002, 4003],
  [4007, 4008],
  [4012, 4013],
  [4017, 4018],
  [4022, 4023],
  [4027, 4028],
  [4032, 4033],
];

function normalizeUrl(fileName) {
  return `${BASE_URL.replace(/\/$/, '')}/generated/${fileName}`;
}

const meta = await sharp(SOURCE).metadata();
const cellW = Math.floor(meta.width / 2);
const cellH = Math.floor(meta.height / 7);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (let row = 0; row < pairsByDay.length; row += 1) {
  for (let col = 0; col < 2; col += 1) {
    const id = pairsByDay[row][col];
    const fileName = `pin-${id}.jpg`;
    const out = path.join(OUTPUT_DIR, fileName);
    const cell = await sharp(SOURCE)
      .extract({
        left: col * cellW,
        top: row * cellH,
        width: col === 1 ? meta.width - cellW : cellW,
        height: row === pairsByDay.length - 1 ? meta.height - row * cellH : cellH,
      })
      .toBuffer();
    const background = await sharp(cell)
      .resize(1000, 1500, { fit: 'cover', position: 'center' })
      .blur(18)
      .modulate({ brightness: 0.82 })
      .toBuffer();
    const foreground = await sharp(cell)
      .resize(1000, 1500, { fit: 'contain', position: 'center' })
      .toBuffer();
    await sharp(background)
      .composite([{ input: foreground, gravity: 'center' }])
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(out);
    console.log(`Updated ${out}`);
  }
}

const batch = JSON.parse(fs.readFileSync(BATCH_PATH, 'utf8'));
const updatedIds = new Set(pairsByDay.flat());
for (const pin of batch) {
  if (!updatedIds.has(Number(pin.id))) continue;
  const fileName = `pin-${pin.id}.jpg`;
  pin.generated_image_path = `public/pinterest/generated/${fileName}`;
  pin.generated_image_url = normalizeUrl(fileName);
  pin.media_source = {
    source_type: 'image_url',
    url: pin.generated_image_url,
  };
}

fs.writeFileSync(BATCH_PATH, `${JSON.stringify(batch, null, 2)}\n`);
console.log(`Updated ${updatedIds.size} corrected style 2/3 pins.`);
