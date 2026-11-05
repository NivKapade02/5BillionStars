/** Browser-only surface used by the payment QR, without Node stream/timer types. */
declare module 'qrcode' {
  export function toDataURL(text: string, options: { width: number; margin: number; errorCorrectionLevel: 'M' }): Promise<string>;
}
