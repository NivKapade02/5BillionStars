/** Combine the actual selected screenshot and complete booking text into one attachment. */
export async function createPaymentProofImage(screenshot: File, message: string, reference: string): Promise<File> {
  const bitmap = await createImageBitmap(screenshot);
  try {
    const width = 1200;
    const scale = Math.min(1, 1120 / bitmap.width, 1800 / bitmap.height);
    const photoWidth = Math.round(bitmap.width * scale);
    const photoHeight = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the payment attachment.');
    context.font = '22px monospace';
    const lines: string[] = [];
    for (const paragraph of message.replace(/```/g, '').replace(/\*/g, '').split('\n')) {
      let line = '';
      for (const character of paragraph) {
        if (context.measureText(line + character).width > 1100) { lines.push(line); line = ''; }
        line += character;
      }
      lines.push(line);
    }
    canvas.width = width;
    canvas.height = 180 + photoHeight + 90 + lines.length * 32 + 40;
    context.fillStyle = '#fffdf9'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#4a3222'; context.fillRect(0, 0, width, 130);
    context.fillStyle = 'white'; context.font = 'bold 32px Arial';
    context.fillText('5 Billion Stars · Payment screenshot', 40, 55);
    context.font = '22px Arial'; context.fillText('Guest-provided proof · Awaiting team verification', 40, 95);
    context.drawImage(bitmap, (width - photoWidth) / 2, 160, photoWidth, photoHeight);
    let y = 160 + photoHeight + 60;
    context.fillStyle = '#352619'; context.font = 'bold 26px Arial';
    context.fillText('Booking details', 40, y);
    y += 45;
    context.font = '22px monospace';
    for (const line of lines) { context.fillText(line, 40, y); y += 32; }
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not create payment attachment.')), 'image/png'));
    return new File([blob], '5-billion-stars-payment-' + reference.replace(/[^a-z0-9-]/gi, '') + '.png', { type: 'image/png' });
  } finally { bitmap.close(); }
}
