import { Component } from '@angular/core';

@Component({
  selector: 'app-camping-schedule',
  standalone: true,
  templateUrl: './camping-schedule.component.html',
  styleUrl: './camping-schedule.component.css'
})
export class CampingScheduleComponent {
  readonly outdoorGames = ['Cricket', 'Volleyball', 'Football', 'Badminton', 'Dart', 'Basketball'];
  readonly indoorGames = ['Carrom', 'Chess', 'Ludo', 'Cross', 'Cards', 'UNO cards'];
}
