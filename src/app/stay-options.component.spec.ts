import { TestBed } from '@angular/core/testing';
import { StayOptionsComponent } from './stay-options.component';

describe('Stay card photos', () => {
  it('serves and decodes the tent and cottage photos used by both cards', async () => {
    await TestBed.configureTestingModule({ imports: [StayOptionsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StayOptionsComponent);
    fixture.detectChanges();
    const photos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>('img'));
    expect(photos.length).toBe(8);
    await Promise.all(photos.map(photo => new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth > 0 ? resolve() : reject(new Error('Empty photo: ' + photo.src));
      image.onerror = () => reject(new Error('Missing photo: ' + photo.src));
      image.src = photo.src;
    })));
  });
});
