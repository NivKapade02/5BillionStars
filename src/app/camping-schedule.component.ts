import { Component } from '@angular/core';

import { GamesSliderComponent } from './games-slider.component';

interface ScheduleEvent {
  step: string;
  time: string;
  datetime: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  icon: string;
  points?: string[];
  meals?: { title: string; description: string; vegetarian: boolean }[];
}

@Component({
  selector: 'app-camping-schedule',
  standalone: true,
  imports: [GamesSliderComponent],
  templateUrl: './camping-schedule.component.html',
  styleUrl: './camping-schedule.component.css'
})
export class CampingScheduleComponent {
  readonly outdoorGames = ['Cricket', 'Volleyball', 'Football', 'Badminton', 'Dart', 'Basketball'];
  readonly indoorGames = ['Carrom', 'Chess', 'Ludo', 'Cross', 'Cards', 'UNO cards'];
  readonly days: { label: string; subtitle: string; icon: string; events: ScheduleEvent[] }[] = [
    { label: 'Day One', subtitle: 'Arrive, explore & unwind', icon: 'bi-sunset', events: [
      { step: '01', time: '4:30 PM', datetime: '16:30', title: 'Welcome to the Campsite', description: 'Settle into your stay, breathe in the fresh air, and explore the nature around you.', image: '/images/camping/lakeside-tents.jpg', alt: 'Tents beside the lake at our campsite', icon: 'bi-tree', points: ['Get your tent and explore the campsite', 'Enjoy indoor and outdoor games'] },
      { step: '02', time: '5:00 PM', datetime: '17:00', title: 'Welcome Tea & Snacks', description: 'A warm welcome, a tasty bite, and a golden-hour view worth slowing down for.', image: '/images/camping/sunset-gazebo.jpg', alt: 'Golden-hour views from the campsite gazebo', icon: 'bi-cup-hot', points: ['Welcome tea and evening snacks', 'Sunset views and nature photography'] },
      { step: '03', time: '8:00 PM', datetime: '20:00', title: 'BBQ, Campfire & DJ Music', description: 'Gather around the campfire, enjoy smoky barbecue, and dance under the stars.', image: '/images/gallery/bonfire.jpg', alt: 'An evening around the campfire', icon: 'bi-fire', meals: [{ title: 'Veg BBQ', description: 'Paneer, potato, capsicum & salad', vegetarian: true }, { title: 'Non-veg BBQ', description: 'Chicken & salad', vegetarian: false }] },
      { step: '04', time: '10:00 PM', datetime: '22:00', title: 'Unlimited Dinner', description: 'Come together for a hearty dinner after an evening of music and memories.', image: '/images/camping/group-dining.jpg', alt: 'Guests sharing a meal at the campsite', icon: 'bi-basket', meals: [{ title: 'Vegetarian', description: 'Mix veg, dal, rice, chapati or rice bhakari, papad, pickle, sweet & salad', vegetarian: true }, { title: 'Non-vegetarian', description: 'Gravy chicken, dry chicken, rice, chapati or rice bhakari, papad, sweet & salad', vegetarian: false }] }
    ] },
    { label: 'Next Morning', subtitle: 'Wake up to nature', icon: 'bi-sunrise', events: [
      { step: '05', time: '9:30 AM', datetime: '09:30', title: 'Morning Bliss', description: 'Start the day with morning tea and poha, fresh air, and a few more beautiful moments together.', image: '/images/camping/lake-and-tikona.jpg', alt: 'Lake and hills surrounding the campsite', icon: 'bi-cup-hot', points: ['Morning tea & poha', 'Relax and make lasting memories'] },
      { step: '06', time: '11:00 AM', datetime: '11:00', title: 'Check out with Memories', description: 'Enjoy the surrounding trails and capture your favourite nature photographs before heading home.', image: '/images/camping/garden-path.jpg', alt: 'A garden path through the campsite', icon: 'bi-camera', points: ['Explore nearby trails and nature', 'Take home photographs and happy memories'] }
    ] }
  ];
}
