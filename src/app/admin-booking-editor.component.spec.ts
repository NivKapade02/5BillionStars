import { AdminBookingEditorComponent } from './admin-booking-editor.component';
import { AdminBooking, FirebaseBookingService } from './firebase-booking.service';

describe('Admin booking editor', () => {
  let store: jasmine.SpyObj<FirebaseBookingService>;
  let editor: AdminBookingEditorComponent;
  beforeEach(() => {
    store = jasmine.createSpyObj<FirebaseBookingService>('store', ['update']);
    store.update.and.resolveTo();
    editor = new AdminBookingEditorComponent(store);
    editor.booking = { id: 'id', reference: 'id', createdAt: '2026-11-07T00:00:00Z', decision: 'confirmed',
      name: 'Website Guest', phone: '+919876543210', stay: 'Tent Stay (2-3 people)',
      checkIn: '2099-01-01', checkOut: '2099-01-03', guests: 3, adults: 2, kids: 1, veg: 1, nonVeg: 2, notes: '' } as AdminBooking;
    editor.ngOnChanges();
  });
  it('edits a copy and previews the recalculated estimate', async () => {
    editor.draft.name = 'Edited Guest';
    editor.draft.stay = 'Cottage Stay (4-5 people)';
    expect(editor.booking.name).toBe('Website Guest');
    expect(editor.quote?.total).toBe(7800);
    const saved = spyOn(editor.saved, 'emit');
    await editor.save();
    expect(store.update).toHaveBeenCalledWith('id', jasmine.objectContaining({ name: 'Edited Guest' }));
    expect(saved).toHaveBeenCalled();
  });
  it('blocks inconsistent meal counts without saving', async () => {
    editor.draft.veg = 3;
    await editor.save();
    expect(store.update).not.toHaveBeenCalled();
    expect(editor.error).toContain('meal counts');
  });
  it('keeps edits available for retry after a failed save', async () => {
    store.update.and.rejectWith(new Error('Offline'));
    const saved = spyOn(editor.saved, 'emit');
    editor.draft.notes = 'Keep this edit';
    await editor.save();
    expect(editor.error).toContain('Could not save');
    expect(editor.draft.notes).toBe('Keep this edit');
    expect(editor.saving).toBeFalse();
    expect(saved).not.toHaveBeenCalled();
    store.update.and.resolveTo();
    await editor.save();
    expect(saved).toHaveBeenCalled();
  });
});
