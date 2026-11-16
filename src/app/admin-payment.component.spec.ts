import { AdminPaymentComponent } from './admin-payment.component';
import { AdminBooking, FirebaseBookingService } from './firebase-booking.service';
describe('Admin payment records', () => {
  it('blocks overpayment and preserves edits when the save fails', async () => {
    const store = jasmine.createSpyObj<FirebaseBookingService>('store', ['setPayment']);
    const component = new AdminPaymentComponent(store);
    component.booking = { id: 'id', name: 'Guest', paidAmount: 100, quote: { total: 1000, advance: 400, balance: 600 } } as AdminBooking;
    component.ngOnChanges(); expect(component.amount).toBe(100);
    component.amount = 1200; await component.save(); expect(store.setPayment).not.toHaveBeenCalled();
    component.amount = 400; component.note = 'Checked account'; store.setPayment.and.rejectWith(new Error('Offline'));
    await component.save(); expect(component.error).toContain('Offline'); expect(component.amount).toBe(400); expect(component.saving).toBeFalse();
    store.setPayment.and.resolveTo(); const saved = spyOn(component.saved, 'emit'); await component.save(); expect(saved).toHaveBeenCalled();
  });
});
