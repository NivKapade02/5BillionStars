import { Component } from '@angular/core';

@Component({ selector: 'app-restaurant', standalone: true, templateUrl: './restaurant.component.html', styleUrl: './restaurant.component.css' })
export class RestaurantComponent {
  readonly dishes = ['Fried fish', 'Mutton', 'Chicken', 'Shev bhaji', 'Puran poli', 'Pithal bhakari', 'Sandwich', 'Anda bhurji'];
  readonly breakfast = ['Misal pav', 'Poha', 'Upit', 'Rava', 'Potato pakoda', 'Onion pakoda', 'Boiled eggs', 'Masala Maggi'];
  readonly drinks = ['Morning special tea', 'Hot coffee', 'Milk', 'Lemon juice', 'Kokam juice'];
  readonly specials = ['Gavran (desi) food', 'Rice bhakari', 'Jowar bhakari', 'Bajra (millet) bhakari', 'Jain food'];
}
