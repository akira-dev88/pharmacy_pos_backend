import db from '../database/connection';
import type { Sale, SaleItem, Payment, CartWithItems, InvoiceItem, Customer, Setting, PharmacyInvoice } from '../types/index';
import { v4 as uuidv4 } from 'uuid';
import { ProductBatchModel }
  from './ProductBatch';
import { H1RegisterModel } from './H1Register';

export class SaleModel {
  // Create sale from cart (checkout) - Fix pattern matching PHP
  static createFromCart(
    cartData: CartWithItems,
    customerUuid: string | null,
    payments: Array<{
      method: string;
      amount: number;
      reference?: string;
    }>,
    prescriptions: any[] = [],
    currentUser?: any
  ): { sale: Sale; paid: number; balance: number } {
    const saleUuid = uuidv4();

    const transaction = db.transaction(() => {
      let total = 0;
      let taxTotal = 0;

      // Calculate totals from cart items
      for (const item of cartData.items) {

        const prescription =
          prescriptions.find(
            p => p.product_uuid === item.product_uuid
          );

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

        // =========================
        // SCHEDULE H
        // =========================

        if (
          product.schedule_type === 'H'
        ) {

          if (
            !prescription ||
            !prescription.prescription_number
          ) {
            throw new Error(
              `${product.name} requires prescription`
            );
          }
        }

        // =========================
        // SCHEDULE H1
        // =========================

        if (
          product.schedule_type === 'H1'
        ) {

          if (
            !prescription ||
            !prescription.prescription_number
          ) {
            throw new Error(
              `${product.name}: prescription required`
            );
          }

          if (!prescription.doctor_name) {
            throw new Error(
              `${product.name}: doctor_name required`
            );
          }

          if (!prescription.patient_name) {
            throw new Error(
              `${product.name}: patient_name required`
            );
          }
        }

        // =========================
        // SCHEDULE X
        // =========================

        if (
          product.schedule_type === 'X'
        ) {

          if (
            !currentUser ||
            currentUser.role !== 'admin'
          ) {
            throw new Error(
              `Only pharmacist/admin can sell ${product.name}`
            );
          }

          if (
            !prescription ||
            !prescription.prescription_number
          ) {
            throw new Error(
              `${product.name}: prescription required`
            );
          }

          if (!prescription.doctor_license) {
            throw new Error(
              `${product.name}: doctor license required`
            );
          }
        }

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

          sale_uuid,
          product_uuid,
          batch_uuid,

          quantity,
          price,
          total,

          gst_percent,

          prescription_required,
          prescription_number,

          doctor_name,
          doctor_license,

          patient_name,
          patient_age,
          patient_gender,

          schedule_type

        ) VALUES (

          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?
        )
      `);

      for (const item of cartData.items) {

        const product = db.prepare(
          'SELECT * FROM products WHERE product_uuid = ?'
        ).get(item.product_uuid) as any;

        const prescription =
          prescriptions.find(
            p => p.product_uuid === item.product_uuid
          );

        const itemTaxAmount =
          (item.price * item.quantity * item.tax_percent) / 100;

        const consumedBatches =
          ProductBatchModel.consumeStockFEFO(
            item.product_uuid,
            item.quantity
          );

        for (const consumed of consumedBatches) {

          const proportionalTax = (
            item.price *
            consumed.quantity *
            item.tax_percent
          ) / 100;

          const result = insertItem.run(

            saleUuid,

            item.product_uuid,

            consumed.batch_uuid,

            consumed.quantity,

            item.price,

            Math.round(
              item.price * consumed.quantity * 100
            ) / 100,

            item.tax_percent,

            product.prescription_required || 0,

            prescription?.prescription_number || null,

            prescription?.doctor_name || null,

            prescription?.doctor_license || null,

            prescription?.patient_name || null,

            prescription?.patient_age || null,

            prescription?.patient_gender || null,

            product.schedule_type || 'NONE'
          );

          // =========================
          // H1 REGISTER ENTRY
          // =========================

          if (
            product.schedule_type === 'H1'
          ) {

            const settings = db.prepare(`

              SELECT pharmacist_name

              FROM settings

              LIMIT 1
            `).get() as {
              pharmacist_name?: string;
            };

            H1RegisterModel.create({

              sale_uuid:
                saleUuid,

              sale_item_id:
                Number(
                  result.lastInsertRowid
                ),

              product_uuid:
                item.product_uuid,

              batch_uuid:
                consumed.batch_uuid,

              prescription_number:
                prescription!
                  .prescription_number,

              doctor_name:
                prescription!
                  .doctor_name,

              doctor_license:
                prescription!
                  .doctor_license,

              patient_name:
                prescription!
                  .patient_name,

              patient_age:
                prescription!
                  .patient_age,

              patient_gender:
                prescription!
                  .patient_gender,

              quantity:
                consumed.quantity,

              pharmacist_name:
                settings
                  .pharmacist_name
            });
          }
        }

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
  // Get invoice details - Pattern matching PHP invoice method
  static getInvoice(
    saleUuid: string
  ): PharmacyInvoice {

    // =========================
    // SALE
    // =========================

    const sale = db.prepare(`

    SELECT *

    FROM sales

    WHERE sale_uuid = ?
  `).get(
      saleUuid
    ) as Sale | undefined;

    if (!sale) {

      throw new Error(
        'Sale not found'
      );
    }

    // =========================
    // SETTINGS
    // =========================

    const settings = db.prepare(`

    SELECT *

    FROM settings

    LIMIT 1
  `).get() as Setting;

    // =========================
    // CUSTOMER
    // =========================

    let customer:
      Customer | undefined;

    if (sale.customer_uuid) {

      customer = db.prepare(`

      SELECT *

      FROM customers

      WHERE customer_uuid = ?
    `).get(
        sale.customer_uuid
      ) as Customer | undefined;
    }

    // =========================
    // SALE ITEMS
    // =========================

    const items = db.prepare(`

    SELECT

      si.id,

      si.sale_uuid,

      si.product_uuid,

      si.batch_uuid,

      si.quantity,

      si.price,

      si.total,

      si.gst_percent,

      si.gst_amount,

      si.schedule_type,

      p.name as product_name,

      p.hsn_code,

      p.manufacturer,

      p.unit,

      pb.batch_number,

      pb.expiry_date

    FROM sale_items si

    INNER JOIN products p
      ON p.product_uuid =
        si.product_uuid

    LEFT JOIN product_batches pb
      ON pb.batch_uuid =
        si.batch_uuid

    WHERE si.sale_uuid = ?
  `).all(
      saleUuid
    ) as Array<{

      id: number;

      sale_uuid: string;

      product_uuid: string;

      batch_uuid: string | null;

      quantity: number;

      price: number;

      total: number;

      gst_percent: number;

      gst_amount: number;

      schedule_type: string;

      product_name: string;

      hsn_code: string | null;

      manufacturer: string | null;

      unit: string;

      batch_number: string | null;

      expiry_date: string | null;
    }>;

    // =========================
    // PAYMENTS
    // =========================

    const payments = db.prepare(`

    SELECT *

    FROM payments

    WHERE sale_uuid = ?
  `).all(
      saleUuid
    ) as Payment[];

    // =========================
    // FORMAT ITEMS
    // =========================

    const formattedItems: InvoiceItem[] =
      items.map((item) => {

        const taxableAmount =
          item.total -
          item.gst_amount;

        const cgst =
          item.gst_amount / 2;

        const sgst =
          item.gst_amount / 2;

        return {

          product_name:
            item.product_name,

          manufacturer:
            item.manufacturer,

          hsn_code:
            item.hsn_code,

          batch_number:
            item.batch_number,

          expiry_date:
            item.expiry_date,

          unit:
            item.unit,

          quantity:
            item.quantity,

          price:
            Number(
              item.price.toFixed(2)
            ),

          taxable_amount:
            Number(
              taxableAmount.toFixed(2)
            ),

          gst_percent:
            item.gst_percent,

          gst_amount:
            Number(
              item.gst_amount.toFixed(2)
            ),

          cgst:
            Number(
              cgst.toFixed(2)
            ),

          sgst:
            Number(
              sgst.toFixed(2)
            ),

          total:
            Number(
              item.total.toFixed(2)
            ),

          schedule_type:
            item.schedule_type
        };
      });

    // =========================
    // SUMMARY
    // =========================

    const taxableTotal =
      formattedItems.reduce(
        (sum, item) =>
          sum + item.taxable_amount,
        0
      );

    const gstTotal =
      formattedItems.reduce(
        (sum, item) =>
          sum + item.gst_amount,
        0
      );

    const grandTotal =
      formattedItems.reduce(
        (sum, item) =>
          sum + item.total,
        0
      );

    // =========================
    // COMPLIANCE FLAGS
    // =========================

    const containsScheduleH =
      formattedItems.some(
        (item) =>
          item.schedule_type === 'H'
      );

    const containsScheduleH1 =
      formattedItems.some(
        (item) =>
          item.schedule_type === 'H1'
      );

    const containsScheduleX =
      formattedItems.some(
        (item) =>
          item.schedule_type === 'X'
      );

    const warnings: string[] = [];

    if (containsScheduleH) {

      warnings.push(
        'Schedule H drug: Warning - To be sold by retail on the prescription of a Registered Medical Practitioner only.'
      );
    }

    if (containsScheduleH1) {

      warnings.push(
        'Schedule H1 drug sold under prescription record compliance.'
      );
    }

    if (containsScheduleX) {

      warnings.push(
        'Schedule X drug dispensed under strict prescription control.'
      );
    }

    // =========================
    // RETURN
    // =========================

    return {

      invoice_number:
        sale.invoice_number,

      invoice_date:
        sale.created_at,

      customer:
        customer
          ? {
            name:
              customer.name,

            mobile:
              customer.mobile,

            address:
              customer.address,

            gstin:
              customer.gstin
          }
          : undefined,

      pharmacy: {

        shop_name:
          settings.shop_name,

        address:
          settings.address,

        mobile:
          settings.mobile,

        gstin:
          settings.gstin,

        drug_license_number:
          settings.drug_license_number,

        pharmacist_name:
          settings.pharmacist_name,

        pharmacist_registration_number:
          settings.pharmacist_registration_number
      },

      items:
        formattedItems,

      summary: {

        subtotal:
          Number(
            taxableTotal.toFixed(2)
          ),

        taxable_total:
          Number(
            taxableTotal.toFixed(2)
          ),

        gst_total:
          Number(
            gstTotal.toFixed(2)
          ),

        cgst_total:
          Number(
            (gstTotal / 2).toFixed(2)
          ),

        sgst_total:
          Number(
            (gstTotal / 2).toFixed(2)
          ),

        grand_total:
          Number(
            grandTotal.toFixed(2)
          )
      },

      payments,

      compliance: {

        contains_schedule_h:
          containsScheduleH,

        contains_schedule_h1:
          containsScheduleH1,

        contains_schedule_x:
          containsScheduleX,

        warnings
      }
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
