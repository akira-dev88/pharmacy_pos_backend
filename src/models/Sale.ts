import db from '../database/connection';
import type { Sale, SaleItem, Payment, CartWithItems } from '../types/index';
import { v4 as uuidv4 } from 'uuid';

export class SaleModel {
  // Create sale from cart (checkout) - Fix pattern matching PHP
  static createFromCart(
    cartData: CartWithItems,
    customerUuid: string | null,
    payments: Array<{ method: string; amount: number; reference?: string }>
  ): { sale: Sale; paid: number; balance: number } {
    const saleUuid = uuidv4();

    const transaction = db.transaction(() => {
      let total = 0;
      let taxTotal = 0;

      // Calculate totals from cart items
      for (const item of cartData.items) {
        const itemTotal = item.price * item.quantity;
        const taxAmount = (itemTotal * item.tax_percent) / 100;

        total += itemTotal;
        taxTotal += taxAmount;

        // Check and update stock
        const product = db.prepare(
          'SELECT * FROM products WHERE product_uuid = ?'
        ).get(item.product_uuid) as any;

        if (!product || product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product?.name || 'product'}`);
        }

        // Decrement stock
        db.prepare(
          'UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE product_uuid = ?'
        ).run(item.quantity, item.product_uuid);
      }

      const grandTotal = total + taxTotal;

      // Generate invoice number
      const invoiceNumber = this.generateInvoiceNumber();

      // Create sale record
      db.prepare(`
        INSERT INTO sales (
          sale_uuid, invoice_number, customer_uuid, 
          total, tax, grand_total, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed')
      `).run(
        saleUuid,
        invoiceNumber,
        customerUuid,
        Math.round(total * 100) / 100,
        Math.round(taxTotal * 100) / 100,
        Math.round(grandTotal * 100) / 100
      );

      // Create sale items
      const insertItem = db.prepare(`
        INSERT INTO sale_items (
          sale_uuid, product_uuid, quantity, 
          price, tax_percent, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of cartData.items) {
        const itemTaxAmount = (item.price * item.quantity * item.tax_percent) / 100;

        insertItem.run(
          saleUuid,
          item.product_uuid,
          item.quantity,
          item.price,
          item.tax_percent,
          Math.round(itemTaxAmount * 100) / 100
        );

        // Stock ledger entry
        db.prepare(`
          INSERT INTO stock_ledgers (
            product_uuid, quantity, type, reference_uuid, note
          ) VALUES (?, ?, 'sale', ?, 'Sale via cart checkout')
        `).run(item.product_uuid, -item.quantity, saleUuid);
      }

      // Create payment records
      let paidAmount = 0;
      const insertPayment = db.prepare(`
        INSERT INTO payments (sale_uuid, method, amount, reference)
        VALUES (?, ?, ?, ?)
      `);

      for (const payment of payments) {
        insertPayment.run(
          saleUuid,
          payment.method,
          Math.round(payment.amount * 100) / 100,
          payment.reference || null
        );
        paidAmount += payment.amount;
      }

      const balance = grandTotal - paidAmount;
      // Update customer credit for Pay Later payments
      const payLaterAmount = payments
        .filter(p => p.method === 'pay_later')   // ✅ CORRECT
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      console.log('[BACK] CUSTOMER UUID:', customerUuid);
      console.log('[BACK] PAY LATER AMOUNT:', payLaterAmount);

      if (customerUuid && payLaterAmount > 0) {
        const customer = db.prepare(`
          SELECT * FROM customers 
          WHERE customer_uuid = ?
        `).get(customerUuid) as any;

        console.log('[BACK] CUSTOMER BEFORE:', customer);

        if (!customer) {
          throw new Error('Customer not found');
        }

        const currentBalance = Number(customer.credit_balance || 0);
        const creditLimit = Number(customer.credit_limit || 0);

        const newBalance = currentBalance + payLaterAmount;

        console.log('[BACK] NEW BALANCE:', newBalance);

        // Credit limit validation
        if (creditLimit > 0 && newBalance > creditLimit) {
          throw new Error('Credit limit exceeded');
        }

        // Update customer balance
        const updateResult = db.prepare(`
          UPDATE customers
          SET credit_balance = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE customer_uuid = ?
        `).run(newBalance, customerUuid);

        console.log('[BACK] UPDATE RESULT:', updateResult);

        // Insert ledger entry
        const ledgerResult = db.prepare(`
  INSERT INTO customer_ledgers (
    customer_uuid,
    type,
    amount,
    reference_uuid,
    note
  ) VALUES (?, 'debit', ?, ?, ?) 
`).run(
          customerUuid,
          payLaterAmount,
          saleUuid,
          `Pay Later invoice #${invoiceNumber}`
        );

        console.log('[BACK] LEDGER RESULT:', ledgerResult);

        // Verify update immediately
        const updatedCustomer = db.prepare(`
          SELECT * FROM customers
          WHERE customer_uuid = ?
        `).get(customerUuid);

        console.log('[BACK] CUSTOMER AFTER:', updatedCustomer);
      }

      console.log('PAYMENTS RECEIVED:', payments);

      // Mark cart as completed
      db.prepare(`
        UPDATE carts 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
        WHERE cart_uuid = ?
      `).run(cartData.cart_uuid);

      const sale = db.prepare('SELECT * FROM sales WHERE sale_uuid = ?').get(saleUuid) as Sale;

      return { sale, paid: paidAmount, balance };
    });

    return transaction();
  }

  // Direct sale (without cart) - Pattern matching PHP createSale
  static createDirectSale(
    items: Array<{
      product_uuid: string;
      quantity: number;
    }>,
    customerUuid?: string | null
  ): { sale: Sale; items: SaleItem[] } {
    const saleUuid = uuidv4();
    const itemsData: any[] = [];

    const transaction = db.transaction(() => {
      let total = 0;
      let taxTotal = 0;

      for (const item of items) {
        const product = db.prepare(
          'SELECT * FROM products WHERE product_uuid = ?'
        ).get(item.product_uuid) as any;

        if (!product) {
          throw new Error(`Product not found: ${item.product_uuid}`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const quantity = item.quantity;
        const price = product.price;
        const taxPercent = product.gst_percent;

        const itemTotal = price * quantity;
        const taxAmount = (itemTotal * taxPercent) / 100;

        total += itemTotal;
        taxTotal += taxAmount;

        // Decrement stock
        db.prepare(
          'UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE product_uuid = ?'
        ).run(quantity, product.product_uuid);

        itemsData.push({
          product_uuid: product.product_uuid,
          quantity: quantity,
          price: price,
          tax_percent: taxPercent,
          tax_amount: Math.round(taxAmount * 100) / 100
        });
      }

      const grandTotal = total + taxTotal;
      const invoiceNumber = this.generateInvoiceNumber();

      // Create sale
      db.prepare(`
        INSERT INTO sales (
          sale_uuid, invoice_number, customer_uuid, 
          total, tax, grand_total, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'completed')
      `).run(
        saleUuid,
        invoiceNumber,
        customerUuid || null,
        Math.round(total * 100) / 100,
        Math.round(taxTotal * 100) / 100,
        Math.round(grandTotal * 100) / 100
      );

      // Create sale items and stock ledgers
      for (const data of itemsData) {
        db.prepare(`
          INSERT INTO sale_items (
            sale_uuid, product_uuid, quantity, 
            price, tax_percent, tax_amount
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          saleUuid,
          data.product_uuid,
          data.quantity,
          data.price,
          data.tax_percent,
          data.tax_amount
        );

        db.prepare(`
          INSERT INTO stock_ledgers (
            product_uuid, quantity, type, reference_uuid, note
          ) VALUES (?, ?, 'sale', ?, 'Direct sale')
        `).run(data.product_uuid, -data.quantity, saleUuid);
      }

      // Customer ledger for direct sale
      if (customerUuid) {
        db.prepare(`
          INSERT INTO customer_ledgers (
            customer_uuid, type, amount, reference_uuid, note
          ) VALUES (?, 'sale', ?, ?, 'Sale created')
        `).run(customerUuid, grandTotal, saleUuid);
      }

      const sale = db.prepare('SELECT * FROM sales WHERE sale_uuid = ?').get(saleUuid) as Sale;

      return { sale, items: itemsData };
    });

    return transaction();
  }

  // Get invoice details - Pattern matching PHP invoice method
  static getInvoice(saleUuid: string): any {
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name, c.mobile as customer_mobile
      FROM sales s
      LEFT JOIN customers c ON s.customer_uuid = c.customer_uuid
      WHERE s.sale_uuid = ?
    `).get(saleUuid) as any;

    if (!sale) return null;

    const items = db.prepare(`
  SELECT si.*, p.name as product_name, p.hsn_code
  FROM sale_items si
  LEFT JOIN products p ON si.product_uuid = p.product_uuid
  WHERE si.sale_uuid = ?
`).all(saleUuid) as any[];

    const payments = db.prepare(
      'SELECT method, amount FROM payments WHERE sale_uuid = ?'
    ).all(saleUuid) as any[];

    const settings = db.prepare('SELECT * FROM settings LIMIT 1').get() as any;

    let total = 0;
    let taxTotal = 0;
    const invoiceItems = [];

    for (const item of items) {
      const price = Number(item.price);
      const qty = Number(item.quantity);
      const taxPercent = Number(item.tax_percent);

      const base = price * qty;
      const tax = (base * taxPercent) / 100;

      invoiceItems.push({
        name: item.product_name,
        hsn_code: item.hsn_code || null,
        qty: qty,
        price: price,
        total: Math.round(base * 100) / 100,
        tax_percent: taxPercent,
        tax_amount: Math.round(tax * 100) / 100,
        cgst: Math.round((tax / 2) * 100) / 100,
        sgst: Math.round((tax / 2) * 100) / 100
      });

      total += base;
      taxTotal += tax;
    }

    // GST Split (India)
    const cgst = taxTotal / 2;
    const sgst = taxTotal / 2;

    return {
      shop: settings ? {
        name: settings.shop_name,
        mobile: settings.mobile,
        address: settings.address,
        gstin: settings.gstin,
      } : null,

      invoice_number: sale.invoice_number,
      date: sale.created_at,

      customer: sale.customer_name ? {
        name: sale.customer_name,
        mobile: sale.customer_mobile
      } : null,

      items: invoiceItems,

      summary: {
        total: Math.round(total * 100) / 100,
        tax: Math.round(taxTotal * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        grand_total: sale.grand_total
      },

      payments: payments.map(p => ({
        method: p.method,
        amount: p.amount
      }))
    };
  }

  // Generate invoice number - Pattern matching PHP
  private static generateInvoiceNumber(): string {
    const setting = db.prepare('SELECT * FROM settings LIMIT 1').get() as any;
    const prefix = setting?.invoice_prefix || 'INV';

    // Get last invoice number
    const lastSale = db.prepare(`
      SELECT invoice_number FROM sales 
      ORDER BY created_at DESC LIMIT 1
    `).get() as any;

    let nextNumber = 1;
    if (lastSale && lastSale.invoice_number) {
      // Extract number from "PREFIX-NUMBER" format
      const parts = lastSale.invoice_number.split('-');
      if (parts.length > 1) {
        const lastNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }

    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  }

  // Find sale by UUID
  static findById(uuid: string): Sale | undefined {
    return db.prepare('SELECT * FROM sales WHERE sale_uuid = ?').get(uuid) as Sale | undefined;
  }

  // Get sales list with pagination - Pattern matching PHP index
  // Get sales list with pagination - Pattern matching PHP index
  static findAll(page: number = 1, limit: number = 50, filters: any): { sales: any[], total: number } {
    const offset = (page - 1) * limit;

    // Build WHERE clause from filters
    let whereClause = '';
    const params: any[] = [];

    if (filters.startDate && filters.endDate) {
      whereClause = 'WHERE s.created_at BETWEEN ? AND ?';
      params.push(filters.startDate, filters.endDate);
    } else if (filters.startDate) {
      whereClause = 'WHERE s.created_at >= ?';
      params.push(filters.startDate);
    } else if (filters.endDate) {
      whereClause = 'WHERE s.created_at <= ?';
      params.push(filters.endDate);
    }

    if (filters.customerUuid) {
      whereClause += whereClause ? ' AND s.customer_uuid = ?' : 'WHERE s.customer_uuid = ?';
      params.push(filters.customerUuid);
    }

    if (filters.status) {
      whereClause += whereClause ? ' AND s.status = ?' : 'WHERE s.status = ?';
      params.push(filters.status);
    }

    // Main query with customer join
    const sales = db.prepare(`
    SELECT s.*, 
           c.name as customer_name, 
           c.mobile as customer_mobile
    FROM sales s
    LEFT JOIN customers c ON s.customer_uuid = c.customer_uuid
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

    // Count total with same filters (without limit/offset)
    const countParams = params.slice(0, -2); // remove limit and offset
    const countResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM sales s
    ${whereClause}
  `).get(...countParams) as any;

    const total = countResult?.count || 0;

    return { sales, total };
  }

  // Get sale with relations
  static findWithRelations(uuid: string): any {
    const sale = this.findById(uuid);
    if (!sale) return null;

    const items = db.prepare(`
      SELECT si.*, p.name as product_name
      FROM sale_items si
      LEFT JOIN products p ON si.product_uuid = p.product_uuid
      WHERE si.sale_uuid = ?
    `).all(uuid);

    const payments = db.prepare('SELECT * FROM payments WHERE sale_uuid = ?').all(uuid);

    const customer = sale.customer_uuid ?
      db.prepare('SELECT * FROM customers WHERE customer_uuid = ?').get(sale.customer_uuid) :
      null;

    return {
      ...sale,
      items,
      payments,
      customer
    };
  }
}
