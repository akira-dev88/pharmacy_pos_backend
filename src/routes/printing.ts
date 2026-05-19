import { Router, Request, Response } from 'express';
import { ThermalPrinterService } from '../services/printerService';

const router = Router();
const printerService = new ThermalPrinterService('localhost', 9104);

router.post('/print-receipt', async (req: Request, res: Response) => {
  try {
    const invoice = req.body;
    
    // Validate invoice data
    if (!invoice || !invoice.invoice_number) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid invoice data' 
      });
    }
    
    console.log('🖨️ Printing receipt for invoice:', invoice.invoice_number);
    
    const result = await printerService.print(invoice);
    
    if (result.success) {
      console.log('✅ Print job sent successfully');
      res.json({ 
        success: true, 
        message: 'Receipt sent to thermal printer',
        printed: true
      });
    } else {
      console.warn('⚠️ Print failed:', result.error);
      res.json({ 
        success: false, 
        message: result.error,
        fallback: true,
        useBrowserPrint: true
      });
    }
  } catch (error) {
    console.error('❌ Print error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      useBrowserPrint: true 
    });
  }
});

// Test endpoint to check printer connection
router.get('/test-printer', async (req: Request, res: Response) => {
  try {
    const testInvoice = {
      invoice_number: 'TEST-001',
      shop: { name: 'Test Store' },
      items: [{ name: 'Test Item', qty: 1, price: 10, total: 10 }],
      summary: { total: 10, grand_total: 10 }
    };
    
    const result = await printerService.print(testInvoice);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Printer test failed' });
  }
});

export default router;