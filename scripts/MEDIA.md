# Website media

Run `npm run optimize:media` after adding photos or videos. Install FFmpeg and
put it on PATH, or set `FFMPEG_PATH` to its executable. Use
`npm run optimize:media -- --images-only` when FFmpeg is unavailable.

The optimizer processes `public` and `src/assets`, preserves image orientation,
transparency and aspect ratio, strips image metadata, and only replaces files
when the result is at least 3% smaller. Image formats and URLs stay the same.
Images are capped at 1920 pixels for banners, 1600 for general photographs,
900 for nearby places, 800 for games and food, and 320 for thumbnails.
Images are never enlarged. Videos retain audio and use H.264/AAC MP4 with
fast-start metadata (VP9/Opus for WebM), capped at 1280 pixels on either side.

Original files are saved under ignored `tmp/media-optimization/originals` before
replacement. Keep those local backups for future full-resolution edits. They
are not published. `tmp/media-optimization/report.json` records file sizes and
hashes so reruns skip unchanged files rather than recompressing them.

Run `npm run verify:media` to decode every image and video and check for corrupt
outputs. This also requires FFmpeg. Review photographs and play videos when
changing compression settings. Small, already-efficient assets may be kept.
