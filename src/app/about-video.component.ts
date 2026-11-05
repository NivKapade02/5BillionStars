import { Component } from '@angular/core';

@Component({
  selector: 'app-about-video',
  standalone: true,
  template: `
    <div class="player" role="group" aria-label="Campsite video">
      <video #video preload="none" playsinline [poster]="poster" (volumechange)="syncVolume(video)"
        tabindex="0" role="button" [attr.aria-label]="playing ? 'Stop campsite video' : 'Play campsite video'" (click)="toggle(video)" (keydown.enter)="toggle(video)" (keydown.space)="$event.preventDefault(); toggle(video)" (play)="playing = true" (pause)="playing = false" (ended)="playing = false" (error)="error = 'This video could not load. Please try again later.'">
        <source src="/video/Website%20Carsuole%20.mp4" type="video/mp4">
      </video>
      @if (!started) { <img class="thumbnail" src="/images/about-video-thumbnail.png" alt="Sunset and Pawana Lake skyview at 5 Billion Stars" (load)="poster = '/images/about-video-thumbnail.png'" (error)="thumbnail.hidden = true" #thumbnail> }
      <button class="play-toggle" [class.hidden]="playing" [attr.tabindex]="playing ? -1 : 0" [attr.aria-hidden]="playing" type="button" (click)="toggle(video)" [attr.aria-label]="playing ? 'Stop campsite video' : 'Play campsite video'">
        <span aria-hidden="true" [class.square]="stopped"></span>
      </button>
      <div class="audio-controls" aria-label="Video audio controls">
        <button class="speaker" type="button" (click)="toggleMute(video)" [attr.aria-label]="muted || volume === 0 ? 'Unmute video' : 'Mute video'" [attr.aria-pressed]="muted || volume === 0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4Z"/>
            @if (muted || volume === 0) { <path d="m16 9 6 6m0-6-6 6"/> } @else { <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/> }
          </svg>
        </button>
      </div>
    </div>
    @if (error) { <p role="status">{{ error }}</p> }
  `,
  styles: `
    :host{display:block}.player{position:relative;overflow:hidden;border-radius:20px;background:#211a15;aspect-ratio:1/1}
    video{display:block;width:100%;height:100%;object-fit:contain}
    .play-toggle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:grid;place-items:center;width:64px;height:64px;border:0;background:transparent;color:#fff;cursor:pointer;filter:drop-shadow(0 2px 5px #0008)}
     .play-toggle span{display:block;width:0;height:0;border-top:20px solid transparent;border-bottom:20px solid transparent;border-left:32px solid white}button span.square{width:30px;height:30px;border:0;background:white}.hidden{visibility:hidden;pointer-events:none}video{cursor:pointer}button:focus-visible{outline:3px solid #dda15e;outline-offset:5px}p{color:#fff;font-size:14px;margin-top:10px}
    .thumbnail{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
    .audio-controls{position:absolute;bottom:12px;right:12px;color:white}
    .speaker{display:grid;place-items:center;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:#211a15cc;color:inherit;cursor:pointer;box-shadow:0 2px 8px #0004}
    @media(max-width:600px){.player{aspect-ratio:4/3} .play-toggle{width:56px;height:56px}}
  `
})
export class AboutVideoComponent {
  poster = '/images/camping/lakeside-tents.jpg';
  started = false;
  volume = 1;
  muted = false;
  playing = false;
  stopped = false;
  error = '';

  syncVolume(video: HTMLVideoElement) {
    this.volume = video.volume;
    this.muted = video.muted;
  }

  toggleMute(video: HTMLVideoElement) {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;
    this.syncVolume(video);
  }

  async toggle(video: HTMLVideoElement) {
    this.error = '';
    if (!video.paused) {
      video.pause();
      video.currentTime = 0;
      this.playing = false;
      this.stopped = true;
      return;
    }
    try { await video.play(); this.playing = true; this.started = true; this.stopped = false; }
    catch { this.error = 'Unable to play this video. Please try again.'; }
  }
}
