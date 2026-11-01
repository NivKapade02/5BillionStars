/** Paste into Extensions > Apps Script in your Google Sheet. */
var BOOKING_HEADERS = ['Booking reference', 'Received at (UTC)', 'Guest name', 'Guest phone', 'Check-in', 'Check-out', 'Guests', 'Special requests', 'Payload signature'];

function setupBookingSheet() {
  var properties = PropertiesService.getScriptProperties();
  var id = properties.getProperty('SPREADSHEET_ID') || '1eZL2JO06jmQ45FPfFSX6E1Kk6IQ7MOb_W3QKZQYoP0E';
  var spreadsheet = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Open this script from your Google Sheet using Extensions > Apps Script.');
  properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  var sheet = spreadsheet.getSheetByName('Bookings') || spreadsheet.insertSheet('Bookings');
  if (sheet.getLastRow() === 0) sheet.appendRow(BOOKING_HEADERS);
  sheet.setFrozenRows(1);
  Logger.log('Booking sheet ready: ' + spreadsheet.getUrl());
}

function bookingJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function bookingDetails(input) {
  if (!input || typeof input !== 'object' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.id || '')) throw new Error('Invalid booking reference.');
  var booking = { id: input.id };
  [['name', 100], ['phone', 20], ['checkIn', 10], ['checkOut', 10], ['notes', 500]].forEach(function(field) {
    var value = input[field[0]] || '';
    if (typeof value !== 'string' || value.length > field[1]) throw new Error('Invalid booking details.');
    booking[field[0]] = value.trim();
  });
  if (booking.name.length < 2 || !/^\+?[1-9][0-9]{7,14}$/.test(booking.phone)) throw new Error('Enter a valid name and phone with country code.');
  ['checkIn', 'checkOut'].forEach(function(key) {
    var date = new Date(booking[key]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking[key]) || !isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== booking[key]) throw new Error('Invalid stay dates.');
  });
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  if (booking.checkIn < today || booking.checkOut <= booking.checkIn) throw new Error('Invalid stay dates.');
  if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > 50) throw new Error('Guests must be between 1 and 50.');
  booking.guests = input.guests;
  return booking;
}

function bookingCell(value) {
  // Preserve phone numbers and keep user text from becoming a spreadsheet formula.
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function doPost(e) {
  var lock;
  try {
    if (!e || !e.postData || e.postData.contents.length > 10000) return bookingJson({ ok: false, error: 'Invalid request.' });
    var booking = bookingDetails(JSON.parse(e.postData.contents));
    var signature = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(booking)));
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) return bookingJson({ ok: false, error: 'Booking sheet is not configured.' });
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return bookingJson({ ok: false, error: 'Please retry shortly.' });
    var sheet = SpreadsheetApp.openById(id).getSheetByName('Bookings');
    if (!sheet || sheet.getLastRow() === 0) return bookingJson({ ok: false, error: 'Run setupBookingSheet first.' });
    if (sheet.getLastRow() > 1) {
      var found = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(booking.id).matchEntireCell(true).findNext();
      if (found) {
        var same = sheet.getRange(found.getRow(), 9).getValue() === signature;
        return bookingJson(same ? { ok: true, id: booking.id } : { ok: false, error: 'Reference already used for different details.' });
      }
    }
    sheet.appendRow([booking.id, new Date().toISOString(), bookingCell(booking.name), bookingCell(booking.phone), booking.checkIn, booking.checkOut, booking.guests, bookingCell(booking.notes), signature]);
    SpreadsheetApp.flush();
    return bookingJson({ ok: true, id: booking.id });
  } catch (error) {
    // Never return account identifiers, sheet contents, or provider errors to visitors.
    return bookingJson({ ok: false, error: 'Could not save the booking. Please check the details and retry.' });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function doGet() {
  return bookingJson({ service: '5 Billion Stars booking form', configured: !!PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') });
}

