# Website photography

Photos selected from `I:\5BS Photo` for the hero, gallery, About, food-section background, Contact and activity schedule. Web copies preserve the full frame, honor camera orientation, and use JPEG quality 82. The hero is at most 1920px wide, gallery photos 1200px, and smaller activity photos 480-900px. Below-the-fold images load lazily.

Food and activity decorations without matching source photos use icons instead of missing image files. The booking form keeps its existing promotional banner.

| Original | Website asset | Dimensions | Size |
| --- | --- | --- | --- |
| I:\5BS Photo\gallery_02 (16).jpg | images/camping/pawna-lake-dusk.jpg | 1920 x 863 | 125 KB |
| I:\5BS Photo\gallery_02 (3).JPG | images/camping/sunset-over-lake.jpg | 1200 x 800 | 62 KB |
| I:\5BS Photo\gallery_02 (8).JPG | images/camping/lake-and-tikona.jpg | 1200 x 800 | 109 KB |
| I:\5BS Photo\gallery_02 (52).jpg | images/camping/lakeside-tents.jpg | 1200 x 677 | 113 KB |
| I:\5BS Photo\gallery_02 (42).JPG | images/camping/sunset-gazebo.jpg | 1200 x 800 | 112 KB |
| I:\5BS Photo\gallery_02 (25).JPG | images/camping/illuminated-campsite.jpg | 1200 x 800 | 83 KB |
| I:\5BS Photo\gallery_02 (53).jpg | images/camping/garden-path.jpg | 1200 x 677 | 224 KB |
| I:\5BS Photo\gallery_02 (23).JPG | images/camping/red-star-lights.jpg | 1200 x 800 | 61 KB |
| I:\5BS Photo\gallery_02 (64).JPG | images/camping/friends-at-campsite.jpg | 1200 x 800 | 161 KB |
| I:\5BS Photo\gallery_02 (55).jpg | images/camping/twilight-camping.jpg | 1200 x 675 | 159 KB |
| I:\5BS Photo\gallery_02 (41).JPG | images/camping/lakeside-dining.jpg | 1200 x 800 | 112 KB |
| I:\5BS Photo\gallery_02 (57).JPG | images/camping/camping-guests.jpg | 480 x 320 | 26 KB |
| I:\5BS Photo\gallery_02 (60).JPG | images/camping/evening-celebration.jpg | 900 x 600 | 91 KB |
| I:\5BS Photo\gallery_02 (1).JPG | images/camping/group-dining.jpg | 900 x 600 | 91 KB |

## Stay options

Both folders were reviewed: `I:\Canon Camera\Camera1` and `I:\5BS Photo\5BS`. The clearest accommodation photos were selected from Camera1.

- Tent Stay: `I:\Canon Camera\Camera1\IMG_9550.JPG` to `public/images/stays/tent-stay.jpg` (1200 x 800, JPEG quality 85).
- Cottage Stay: `I:\Canon Camera\Camera1\IMG_9469.JPG` to `public/images/stays/cottage-stay.jpg` (1200 x 800, JPEG quality 85).

## Gazebo hero banner

Matched to the user reference: I:\5BS Photo\gallery_02 (51).jpg. Exported to public/images/camping/gazebo-lake-banner.jpg at 1920px wide, JPEG quality 85. The website hero uses this photo with a light overlay and no central diamond backdrop.

## Activity gallery

Added six labelled photos: Dance, Bonfire, Sports, Sunset, Sunrise and Swing. Dance reuses the existing evening-celebration photo. New copies are at most 1000px on the longest side, quality 82; orientation is corrected from camera metadata. The Sunrise category shows early-morning campsite light from IMG20221231071646.jpg, rather than claiming the sun itself is visible.

- bonfire.jpg: I:\5BS Photo\gallery_02 (68).JPG
- sports.jpg: I:\5BS Photo\5BS\20231215181345_IMG_7123.JPG
- sunset.jpg: I:\5BS Photo\gallery_02 (56).JPG
- sunrise.jpg: I:\5BS Photo\5 Billion Stars photo\Exterorior\IMG20221231071646.jpg
- swing.jpg: I:\Canon Camera\Camera1\IMG_9633.JPG

## Stay reference details

The stay cards now include the amenity lists from the user-provided Tent Stay and Luxury Cottages posters, plus circular photo previews. Extra Camera1 source images: IMG_9424.JPG (tent front), IMG_9428.JPG (tent bedding), IMG_9433.JPG (view from tent), IMG_9585.JPG (cottages at night), IMG_9477.JPG (cottage bedding), and IMG_9452.JPG (sunset through cottage doorway). Optimized assets are in public/images/stays.

## Expanded gallery slider

The gallery has 24 real site photographs with next/previous controls, keyboard navigation, swipe support and small selectable thumbnails. It includes six additional source exports: root gallery_02 (9), (29), (50), (67), Camera1 IMG_9542, and 5BS IMG_7192. The AI-assisted tent-poster background is used only in the Tent Stay card, not in this photographic gallery; see tent-background-prompt.md for its provenance.

## Homepage banner slideshow

Five local original photos are resized to at most 1920px wide (without upscaling), with camera orientation corrected, and saved as quality-85 JPEGs in public/images/banner. The slideshow rotates every five seconds with a soft fade and a gentle zoom-out. Pause and selection controls remain available, including reduced-motion support.

| Banner file | Original photo |
| --- | --- |
| gazebo.jpg | I:\5BS Photo\gallery_02 (51).jpg |
| sunset.jpg | I:\5BS Photo\gallery_02 (37).JPG |
| garden.jpg | I:\5BS Photo\gallery_02 (54).jpg |
| lakeside-tent.jpg | I:\Canon Camera\Camera1\IMG_9550.JPG |
| cottages-at-night.jpg | I:\Canon Camera\Camera1\IMG_9585.JPG |

Tent Stay main photo: public/images/stays/tent-lake-front.jpg, exported from I:\Canon Camera\Camera1\IMG_9422.JPG (the user-supplied green tent and lake photo). Replaces the poster-inspired background on the stay card.


## Curated 200-item gallery

The gallery now contains 180 selected photos and 20 short video previews from I:\5BS Photo and I:\Canon Camera\Camera1. Selection used image resolution, exposure and detail checks, near-duplicate screening and visual review of contact sheets. Unrelated graphics and visibly poor frames were excluded. The selection balances scenery, tent/cottage stays, food, bonfires, games and celebrations.

All new assets are in public/images/gallery/collection: numbered photos, thumbs, and videos. Photos fit within 1440x1080 without upscaling; thumbnails fit within 240x160. MP4 previews start two seconds into their source, run up to 12 seconds, use H.264/AAC and fast-start metadata, and fit within 1280x720. Originals remain in their source folders.

The source-to-output mapping for all 200 items is gallery-media-sources.json. The slider has All/Photos/Videos filters and supports keyboard and swipe navigation. Videos require pressing Play and use preload=none. Full photos load only when selected, and thumbnails use browser lazy loading.


## Featured group activities

Eight outdoor-game photos from Camera1 IMG_7120, IMG_7122, IMG_7123, IMG_7125, IMG_7126, IMG_7129, IMG_7130 and IMG_7131 replace similar cottage angles within the existing 200-item selection. Visual review confirms guests playing beside the tents. Dancing (six photos and five video previews), Outdoor Games (eight photos), and Group Moments (six photos and two videos) now have gallery filters. Per-item categories and sources are recorded in gallery-media-sources.json.

## Gallery automatic slideshow

The gallery advances every five seconds while visible, with a play/pause button. Hidden tabs and offscreen galleries do not advance. Playing videos hold the current item; videos still require the visitor to press Play. Reduced-motion preferences start the slideshow paused. Timers and motion listeners are removed when the component is destroyed.
