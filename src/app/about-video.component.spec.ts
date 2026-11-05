import { AboutVideoComponent } from './about-video.component';

describe('About campsite video', () => {
  it('plays on request and stops at the beginning on the next request', async () => {
    const component = new AboutVideoComponent();
    const video = {
      paused: true, currentTime: 12,
      play: jasmine.createSpy('play').and.resolveTo(),
      pause: jasmine.createSpy('pause')
    };
    await component.toggle(video as unknown as HTMLVideoElement);
    expect(video.play).toHaveBeenCalled();
    video.paused = false;
    await component.toggle(video as unknown as HTMLVideoElement);
    expect(video.pause).toHaveBeenCalled();
    expect(video.currentTime).toBe(0);
  });

  it('shows a useful message when playback fails', async () => {
    const component = new AboutVideoComponent();
    await component.toggle({ paused: true, play: () => Promise.reject(new Error('Unavailable')) } as unknown as HTMLVideoElement);
    expect(component.error).toContain('Unable to play');
  });
});
