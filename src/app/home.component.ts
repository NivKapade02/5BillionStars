import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingComponent } from './booking.component';
import { StayOptionsComponent } from './stay-options.component';
import { PhotoGalleryComponent } from './photo-gallery.component';
import { HeroBannerComponent } from './hero-banner.component';
import { CampingScheduleComponent } from './camping-schedule.component';
import { GoogleReviewsComponent } from './google-reviews.component';
import { BookingGuideComponent } from './booking-guide.component';
import { RestaurantComponent } from './restaurant.component';
import { SiteFooterComponent } from './site-footer.component';
import { ScrollTopComponent } from './scroll-top.component';
import { SectionLinkDirective } from './section-link.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SectionLinkDirective, BookingComponent, StayOptionsComponent, PhotoGalleryComponent, HeroBannerComponent, CampingScheduleComponent, GoogleReviewsComponent, BookingGuideComponent, RestaurantComponent, SiteFooterComponent, ScrollTopComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  menuOpen = false;
  bookingOpened = false;
  selectedStay = '';
  @ViewChild('bookingDialog', { static: true }) bookingDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild(BookingComponent) bookingForm?: BookingComponent;

  openBooking(stay?: string) {
    if (this.bookingForm?.submitting) return;
    if (stay && stay !== this.selectedStay) {
      this.selectedStay = stay;
      if (this.bookingForm) {
        this.bookingForm.reference = '';
        this.bookingForm.whatsappUrl = '';
      }
    }
    this.menuOpen = false;
    this.bookingOpened = true;
    this.bookingDialog.nativeElement.showModal();
  }

  closeBooking() {
    if (!this.bookingForm?.submitting) this.bookingDialog.nativeElement.close();
  }

  cancelBooking(event: Event) {
    if (this.bookingForm?.submitting) event.preventDefault();
  }
}
