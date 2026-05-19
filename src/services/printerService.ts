import * as net from 'net';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface InvoiceItem {
    name: string;
    qty: number;
    price: number;
    total: number;
    hsn_code?: string;
    tax_percent?: number;
    cgst?: number;
    sgst?: number;
}

interface Invoice {
    invoice_number: string;
    date?: string;
    created_at?: string;
    shop?: {
        name?: string;
        address?: string;
        mobile?: string;
        gstin?: string;
    };
    customer?: {
        name?: string;
        mobile?: string;
    };
    items?: InvoiceItem[];
    summary?: {
        total?: number;
        tax?: number;
        cgst?: number;
        sgst?: number;
        grand_total?: number;
    };
    discount?: number;
    payments?: Array<{ method: string; amount: number }>;
}

export class ThermalPrinterService {
    private printerHost: string;
    private printerPort: number;
    private printerName: string | null;
    private readonly PAPER_WIDTH = 32; // 32 characters for 80mm paper

    constructor(host: string = 'localhost', port: number = 9104, printerName: string | null = null) {
        this.printerHost = host;
        this.printerPort = port;
        this.printerName = printerName;
    }

    // Helper: Center text for thermal paper
    private centerText(text: string): string {
        const textLength = text.length;
        if (textLength >= this.PAPER_WIDTH) return text;
        const padding = Math.floor((this.PAPER_WIDTH - textLength) / 2);
        return ' '.repeat(padding) + text;
    }

    // Helper: Add line separator
    private addSeparator(commands: number[], encoder: TextEncoder, char: string = '-'): void {
        const separator = char.repeat(this.PAPER_WIDTH);
        commands.push(...encoder.encode(separator + '\n'));
    }

    private formatToESC_POS(invoice: Invoice): Buffer {
        const encoder = new TextEncoder();
        let commands: number[] = [];

        // Initialize printer
        commands.push(0x1B, 0x40); // ESC @

        // Use center alignment ESC/POS command for the entire document
        commands.push(0x1B, 0x61, 0x01); // Center align all text

        // ========== HEADER ==========
        const shopName = invoice.shop?.name || 'MY STORE';
        commands.push(0x1B, 0x45, 0x01); // ESC E 1 (bold on)

        commands.push(...encoder.encode(shopName + '\n'));

        if (invoice.shop?.address) {
            commands.push(...encoder.encode(invoice.shop.address + '\n'));
        }

        if (invoice.shop?.mobile) {
            commands.push(...encoder.encode('Ph: ' + invoice.shop.mobile + '\n'));
        }

        if (invoice.shop?.gstin) {
            commands.push(...encoder.encode('GSTIN: ' + invoice.shop.gstin + '\n'));
        }

        commands.push(...encoder.encode('\n'));
        this.addSeparator(commands, encoder, '-');

        // Invoice details
        commands.push(...encoder.encode(`Invoice #: ${invoice.invoice_number}\n`));
        const dateStr = invoice.date || invoice.created_at || new Date().toISOString();
        commands.push(...encoder.encode(`Date: ${new Date(dateStr).toLocaleString()}\n`));

        if (invoice.customer?.name) {
            commands.push(...encoder.encode(`Customer: ${invoice.customer.name}\n`));
        }
        if (invoice.customer?.mobile) {
            commands.push(...encoder.encode(`Mobile: ${invoice.customer.mobile}\n`));
        }

        this.addSeparator(commands, encoder, '-');
        commands.push(...encoder.encode('TAX INVOICE\n'));
        this.addSeparator(commands, encoder, '-');

        // Items header - For table, we need to use left align temporarily
        commands.push(0x1B, 0x61, 0x01); // Left align for table columns

        // Create table header with proper spacing
        const headerLine =
            'Item'.padEnd(16) +
            'Qty'.padStart(4) +
            'Rate'.padStart(8) +
            'Amt'.padStart(8);
        commands.push(...encoder.encode(headerLine + '\n'));
        this.addSeparator(commands, encoder, '-');

        // Items
        invoice.items?.forEach(item => {
            // Format each column with proper spacing
            const nameLine = item.name.substring(0, 16).padEnd(16);
            const qtyLine = item.qty.toString().padStart(4);
            const rateLine = Number(item.price).toFixed(2).toString().padStart(8);
            const totalLine = Number(item.total).toFixed(2).toString().padStart(8);

            // Add a space between columns for clarity
            const itemLine = `${nameLine} ${qtyLine} ${rateLine} ${totalLine}`;
            commands.push(...encoder.encode(itemLine + '\n'));

            // Tax info if available (indented)
            if (item.hsn_code || item.tax_percent) {
                let taxLine = '  ';
                if (item.hsn_code) taxLine += `HSN:${item.hsn_code} `;
                if (item.tax_percent) taxLine += `${item.tax_percent}% GST`;
                if (item.cgst && item.sgst && item.tax_percent) {
                    taxLine += ` (C:${item.cgst.toFixed(2)} S:${item.sgst.toFixed(2)})`;
                }
                commands.push(...encoder.encode(taxLine + '\n'));
            }
        });

        this.addSeparator(commands, encoder, '-');

        // Switch back to center align for summary
        commands.push(0x1B, 0x61, 0x01); // Center align

        // Summary
        const subtotal = (invoice.summary?.total || 0).toFixed(2);
        commands.push(...encoder.encode(`Subtotal: Rs.${subtotal}\n`));

        if ((invoice.summary?.tax || 0) > 0) {
            const cgst = (invoice.summary?.cgst || (invoice.summary?.tax || 0) / 2).toFixed(2);
            const sgst = (invoice.summary?.sgst || (invoice.summary?.tax || 0) / 2).toFixed(2);
            commands.push(...encoder.encode(`CGST: Rs.${cgst}\n`));
            commands.push(...encoder.encode(`SGST: Rs.${sgst}\n`));
        }

        if ((invoice.discount || 0) > 0) {
            const discount = (invoice.discount || 0).toFixed(2);
            commands.push(...encoder.encode(`Discount: -Rs.${discount}\n`));
        }

        this.addSeparator(commands, encoder, '=');

        // Grand Total
        const grandTotal = (invoice.summary?.grand_total || 0).toFixed(2);
        commands.push(...encoder.encode(`TOTAL: Rs.${grandTotal}\n`));

        this.addSeparator(commands, encoder, '=');

        // Payments
        if (invoice.payments && invoice.payments.length > 0) {
            commands.push(...encoder.encode('Payment Details:\n'));
            invoice.payments.forEach(payment => {
                commands.push(...encoder.encode(`${payment.method}: Rs.${payment.amount.toFixed(2)}\n`));
            });
            this.addSeparator(commands, encoder, '-');
        }

        // Footer
        commands.push(...encoder.encode('\n'));
        commands.push(...encoder.encode('** THANK YOU **\n'));
        commands.push(...encoder.encode('Visit us again!\n'));
        commands.push(...encoder.encode('\n'));
        commands.push(...encoder.encode('Computer generated invoice\n'));
        commands.push(...encoder.encode('\n\n\n'));

        // Cut paper
        commands.push(0x1D, 0x56, 0x00); // GS V 0 (full cut)

        return Buffer.from(commands);
    }

    private async printViaWindows(data: Buffer): Promise<{ success: boolean; error?: string; printed?: boolean }> {
        return new Promise((resolve) => {
            // Write ESC/POS data to a temp file
            const tmpFile = path.join(os.tmpdir(), `receipt_${Date.now()}.bin`);
            fs.writeFileSync(tmpFile, data);

            // Send raw data to Windows printer using print command
            const cmd = `copy /b "${tmpFile}" "${this.printerName}"`;
            exec(cmd, (error) => {
                fs.unlinkSync(tmpFile); // clean up temp file
                if (error) {
                    resolve({ success: false, error: error.message, printed: false });
                } else {
                    resolve({ success: true, printed: true });
                }
            });
        });
    }

    async print(invoice: Invoice): Promise<{ success: boolean; error?: string; printed?: boolean }> {
    const printData = this.formatToESC_POS(invoice);

    // If printer name is set, use Windows USB printing
    if (this.printerName) {
      return this.printViaWindows(printData);
    }

    // Otherwise use TCP/network (WiFi or LAN) — your existing code
    return new Promise((resolve) => {
      const client = new net.Socket();

      const timeout = setTimeout(() => {
        client.destroy();
        resolve({
          success: false,
          error: 'Printer not connected - check if printer is on and connected',
          printed: false
        });
      }, 3000);

      client.connect(this.printerPort, this.printerHost, () => {
        clearTimeout(timeout);
        client.write(printData, (err) => {
          if (err) {
            resolve({ success: false, error: err.message, printed: false });
          } else {
            resolve({ success: true, printed: true });
          }
          client.end();
        });
      });

      client.on('error', () => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: `Cannot connect to printer at ${this.printerHost}:${this.printerPort}`,
          printed: false
        });
      });
    });
  }
}