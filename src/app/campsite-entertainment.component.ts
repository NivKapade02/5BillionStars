import { Component } from '@angular/core';

@Component({
  selector: 'app-campsite-entertainment',
  standalone: true,
  templateUrl: './campsite-entertainment.component.html',
  styleUrl: './campsite-entertainment.component.css'
})
export class CampsiteEntertainmentComponent {
  readonly experiences = [
    { name: 'Movie nights', image: 'saiyaara.webp?v=c3bc8998', alt: 'Saiyaara movie preview', icon: 'bi-film', title: 'A movie. A big screen. A sky full of stars.', description: 'Settle in with your favourite people and enjoy a movie on our campsite projector and screen.', label: 'Cinema at camp' },
    { name: 'Live cricket', image: 'cricket.webp?v=a8cdadd0', alt: 'Cricket screening preview', icon: 'bi-broadcast', title: 'Big matches deserve a big screen.', description: 'Catch the cricket action on our projector screen and share every boundary, wicket and cheer with your group.', label: 'Cheer together' },
    { name: 'Karaoke', image: 'karaoke.webp?v=545fd15f', alt: 'Karaoke singalong preview', icon: 'bi-mic', title: 'Your favourite songs. Your turn in the spotlight.', description: 'Follow the lyrics on the big screen, pick a favourite and turn the evening into a campsite singalong.', label: 'Sing together' }
  ];
  selectedIndex = 0;
  get selected() { return this.experiences[this.selectedIndex]; }
}
