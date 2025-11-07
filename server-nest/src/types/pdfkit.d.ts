declare module 'pdfkit' {
  interface PDFKitOptions {
    margin?: number;
    size?: string | [number, number];
  }

  class PDFDocument {
    constructor(options?: PDFKitOptions);
    pipe(destination: any): any;
    fontSize(size: number): this;
    // text(content) and text(content, x, y, options?) overloads
    text(content: string, options?: any): this;
    text(content: string, x: number, y?: number, options?: any): this;
    moveDown(amount?: number): this;
    addPage(options?: any): this;
    on(event: string, cb: (...args: any[]) => void): this;
    y: number;
    page: {
      width?: number;
      height?: number;
      margins?: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
      };
    };
    // drawing methods
    fillColor(color: string): this;
    strokeColor(color: string): this;
    rect(x: number, y: number, w: number, h: number): this;
    fill(color: string): this;
    save(): this;
    restore(): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(): this;
    lineWidth(w: number): this;
    // font management
    font(name: string): this;
    // measure helpers
    heightOfString(text: string, options?: any): number;
    end(): void;
  }

  export default PDFDocument;
}
