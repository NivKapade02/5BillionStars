import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

interface RestaurantDish {
  name: string;
  category: string;
  label: string;
  badge: string;
  image: string;
  description: string;
  price: number | null;
  vegetarian: boolean;
}

@Component({ selector: 'app-restaurant', standalone: true, templateUrl: './restaurant.component.html', styleUrl: './restaurant.component.css' })
export class RestaurantComponent implements AfterViewInit, OnDestroy {
  @ViewChild('menuViewport') private menuViewport?: ElementRef<HTMLDivElement>;
  private slideTimer?: ReturnType<typeof setInterval>;
  autoplay = true;
  pointerPaused = false;
  focusPaused = false;
  firstVisibleIndex = 0;
  visibleCount = 3;

  ngAfterViewInit() {
    this.autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    queueMicrotask(() => this.updateSlidePosition());
    this.slideTimer = setInterval(() => {
      if (this.autoplay && !this.pointerPaused && !this.focusPaused && !document.hidden) this.slideMenu(1);
    }, 4500);
  }

  ngOnDestroy() { clearInterval(this.slideTimer); }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.firstVisibleIndex = 0;
    this.menuViewport?.nativeElement.scrollTo({ left: 0, behavior: 'instant' });
  }

  updateSlidePosition() {
    const viewport = this.menuViewport?.nativeElement;
    const card = viewport?.querySelector<HTMLElement>('.food-card');
    if (!viewport || !card) return;
    const gap = parseFloat(getComputedStyle(viewport).columnGap) || 0;
    const step = card.getBoundingClientRect().width + gap;
    if (step <= 0) return;
    this.visibleCount = Math.max(1, Math.round((viewport.clientWidth + step - card.offsetWidth) / step));
    this.firstVisibleIndex = Math.round(viewport.scrollLeft / step);
  }

  slideMenu(direction: number) {
    const viewport = this.menuViewport?.nativeElement;
    const card = viewport?.querySelector<HTMLElement>('.food-card');
    if (!viewport || !card) return;
    const gap = parseFloat(getComputedStyle(viewport).columnGap) || 0;
    const step = card.getBoundingClientRect().width + gap;
    if (step <= 0) return;
    const count = Math.max(1, Math.round((viewport.clientWidth + gap) / step));
    const end = viewport.scrollWidth - viewport.clientWidth;
    if (end < 1) return;
    const currentIndex = Math.round(viewport.scrollLeft / step);
    const left = direction > 0
      ? (viewport.scrollLeft >= end - 2 ? 0 : Math.min(end, (currentIndex + count) * step))
      : (viewport.scrollLeft <= 2 ? end : Math.max(0, (currentIndex - count) * step));
    // Avoid mobile smooth-scroll / scroll-snap conflicts when tapping either arrow.
    const instant = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollTo({ left, behavior: instant ? 'instant' : 'smooth' });
  }

  get lastVisibleIndex() { return Math.min(this.filteredMenu.length, this.firstVisibleIndex + this.visibleCount); }
  readonly categories = ['All', 'Thalis', 'Vegetarian', 'Non-vegetarian', 'Breakfast & bites', 'Barbecue', 'Drinks'];
  selectedCategory = 'All';
  private dish(name: string, file: string, category: string, label: string, description: string, price: number | null = null): RestaurantDish {
    return { name, category, label, description, price, vegetarian: label !== 'Non-vegetarian' && label !== 'Contains egg', image: '/images/restaurant/' + file, badge: name.startsWith('Unlimited') ? 'Unlimited' : category === 'Thalis' ? 'Thali' : label };
  }
  readonly menu: RestaurantDish[] = [
    this.dish('Unlimited Veg Thali', 'veg-thali.webp', 'Thalis', 'Vegetarian', 'A hearty vegetarian meal, full of homemade flavour.', 300),
    this.dish('Unlimited Chicken Thali', 'chicken-thali.webp?v=6acf9fa7', 'Thalis', 'Non-vegetarian', 'A hearty chicken meal with local flavours and homemade masalas.', 350),
    this.dish('Mutton Thali', 'mutton-thali.webp', 'Thalis', 'Non-vegetarian', 'A comforting mutton meal with traditional accompaniments.'),
    this.dish('Paneer Masala', 'paneer-masala.webp', 'Vegetarian', 'Vegetarian', 'Paneer in a rich, aromatic masala gravy.'),
    this.dish('Shev Bhaji', 'shev-bhaji.webp', 'Vegetarian', 'Vegetarian', 'A local favourite with shev and a flavourful gravy.'),
    this.dish('Pithal Bhakari', 'pithal-bhakari.webp?v=a0ee4d8d', 'Vegetarian', 'Vegetarian', 'Traditional pithal paired with rustic bhakari.'),
    this.dish('Puran Poli', 'puran-poli.webp', 'Vegetarian', 'Vegetarian', 'A sweet Maharashtrian favourite to savour.'),
    this.dish('Chicken Curry', 'chicken.webp', 'Non-vegetarian', 'Non-vegetarian', 'Chicken cooked in a hearty, spiced gravy.'),
    this.dish('Mutton Bhakari', 'mutton-bhakari.webp', 'Non-vegetarian', 'Non-vegetarian', 'A rustic pairing of mutton and traditional bhakari.'),
    this.dish('Fish Fry', 'fish-fry.webp', 'Non-vegetarian', 'Non-vegetarian', 'Spiced fish, fried until golden.'),
    this.dish('Egg Curry', 'egg-curry.webp', 'Non-vegetarian', 'Contains egg', 'Eggs in a warming, flavourful curry.'),
    this.dish('Boiled Eggs', 'boils-egg.webp?v=ccb1bff9', 'Breakfast & bites', 'Contains egg', 'Simply boiled eggs for a light, satisfying bite.'),
    this.dish('Anda Bhurji', 'anda-bhurji.webp?v=fdaebfa0', 'Breakfast & bites', 'Contains egg', 'Scrambled eggs tossed with vegetables and spices.'),
    this.dish('Egg  Omelette', 'egg-paratha.webp?v=1e4d34ab', 'Breakfast & bites', 'Contains egg', 'A satisfying paratha with an egg filling.'),
    this.dish('Misal Pav', 'misal-pav.webp', 'Breakfast & bites', 'Vegetarian', 'Spicy misal served with soft pav.'),
    this.dish('Poha', 'poha.webp?v=2aff4efe', 'Breakfast & bites', 'Vegetarian', 'Light, comforting poha for a fresh start.'),
    this.dish('Rava Upma', 'rava-upama.webp', 'Breakfast & bites', 'Vegetarian', 'A warm, savoury breakfast favourite.'),
    this.dish('Rava', 'rava.webp', 'Breakfast & bites', 'Vegetarian', 'A comforting sweet rava preparation.'),
    this.dish('Puri Bhaji', 'puribhaji.webp?v=7e064304', 'Breakfast & bites', 'Vegetarian', 'Puris served with a flavourful vegetable bhaji.'),
    this.dish('Batata Pakoda(Bhaji)', 'batata-pakoda.webp?v=7c3a1e19', 'Breakfast & bites', 'Vegetarian', 'Golden potato fritters for a relaxed snack.'),
    this.dish('Onion Pakoda(Bhaji)', 'onion-pakoda.webp', 'Breakfast & bites', 'Vegetarian', 'Crisp onion fritters to enjoy with your tea.'),
    this.dish('Masala Maggi', 'masala-maggi.webp', 'Breakfast & bites', 'Vegetarian', 'A warm bowl of noodles with masala flavour.'),
    this.dish('Sandwich', 'sandwitch.webp?v=03d9519b', 'Breakfast & bites', 'Vegetarian', 'A comforting sandwich for a quick bite.'),
    this.dish('Chicken Barbecue', 'chicken-bbq.webp', 'Barbecue', 'Non-vegetarian', 'Spiced chicken grilled for an evening at camp.'),
    this.dish('Paneer Barbecue', 'paneer-bbq.jpg', 'Barbecue', 'Vegetarian', 'Paneer and vegetables grilled on skewers.'),
    this.dish('Masala Chai', 'masala-chai.webp', 'Drinks', 'Hot drinks', 'A warming cup of tea with aromatic spices.'),
    this.dish('Coffee', 'coffee.webp', 'Drinks', 'Hot drinks', 'A comforting coffee to sip by the lake.'),
    this.dish('Lemon Juice', 'lemon-juice.webp', 'Drinks', 'Refreshments', 'A refreshing lemon drink to enjoy by the lake.'),
    this.dish('Milk', 'milk.webp', 'Drinks', 'Dairy', 'A comforting glass of milk.'),
    this.dish('Cold Drinks', 'cold-drinks.webp?v=f6a92f8b', 'Drinks', 'Refreshments', 'A chilled drink to refresh your day. Ask about available options.')
  ];
  enquiryUrl(name: string) { return 'https://wa.me/918624908808?text=' + encodeURIComponent('Hello, I would like to ask about ' + name + ' at your restaurant.'); }
  get filteredMenu() { return this.selectedCategory === 'All' ? this.menu : this.menu.filter(item => item.category === this.selectedCategory); }
}
