import db from '../database/connection';
import type { Customer, CustomerLedger, CustomerLedgerWithBalance, CustomerAging, CustomerReminder, CustomerSummary } from '../types/index';
import { v4 as uuidv4 } from 'uuid';

export class CustomerModel {
  // Create new customer
  static create(data: {
    name: string;
    mobile?: string;
    address?: string;
    gstin?: string;
    credit_limit?: number;
  }): Customer {
    const uuid = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO customers (
        customer_uuid, name, mobile, address, gstin, credit_balance, credit_limit
      ) VALUES (?, ?, ?, ?, ?, 0.00, ?)
    `);

    stmt.run(
      uuid,
      data.name,
      data.mobile || null,
      data.address || null,
      data.gstin || null,
      data.credit_limit || 0
    );

    return this.findById(uuid)!;
  }

  // Find customer by UUID
  static findById(uuid: string): Customer | undefined {
    return db.prepare('SELECT * FROM customers WHERE customer_uuid = ?').get(uuid) as Customer | undefined;
  }

  // Find customer by mobile
  static findByMobile(mobile: string): Customer | undefined {
    return db.prepare('SELECT * FROM customers WHERE mobile = ?').get(mobile) as Customer | undefined;
  }

  // Search customers
  static search(query: string, limit: number = 20): Customer[] {
    return db.prepare(`
      SELECT * FROM customers 
      WHERE name LIKE ? OR mobile LIKE ?
      ORDER BY name ASC 
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, limit) as Customer[];
  }

  // List all customers
  static findAll(): Customer[] {
    return db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all() as Customer[];
  }

  // Update customer
  static update(uuid: string, data: {
    name?: string;
    mobile?: string;
    address?: string;
    gstin?: string;
    credit_limit?: number;
  }): Customer | undefined {
    const customer = this.findById(uuid);
    if (!customer) return undefined;

    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updateFields.push('name = ?');
      values.push(data.name);
    }
    if (data.mobile !== undefined) {
      updateFields.push('mobile = ?');
      values.push(data.mobile);
    }
    if (data.address !== undefined) {
      updateFields.push('address = ?');
      values.push(data.address);
    }
    if (data.gstin !== undefined) {
      updateFields.push('gstin = ?');
      values.push(data.gstin);
    }
    if (data.credit_limit !== undefined) {
      updateFields.push('credit_limit = ?');
      values.push(data.credit_limit);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(uuid);

      db.prepare(`UPDATE customers SET ${updateFields.join(', ')} WHERE customer_uuid = ?`).run(...values);
    }

    return this.findById(uuid);
  }

  // Delete customer
  static delete(uuid: string): boolean {
    const result = db.prepare('DELETE FROM customers WHERE customer_uuid = ?').run(uuid);
    return result.changes > 0;
  }

  // Get customer ledger with running balance
  static getLedger(customerUuid: string): CustomerLedgerWithBalance[] {
    const entries = db.prepare(`
      SELECT * FROM customer_ledgers 
      WHERE customer_uuid = ? 
      ORDER BY created_at ASC
    `).all(customerUuid) as CustomerLedger[];

    let balance = 0;
    return entries.map(entry => {
      // Debit increases balance (customer owes more), credit/payment decreases
      balance += entry.type === 'debit' || entry.type === 'sale' 
        ? entry.amount 
        : -entry.amount;

      return {
        ...entry,
        balance: Math.round(balance * 100) / 100
      };
    });
  }

  // Get customer summary
  static getSummary(): CustomerSummary {
    const totalCredit = (db.prepare(
      'SELECT COALESCE(SUM(credit_balance), 0) as total FROM customers'
    ).get() as any).total;

    const customersWithCredit = (db.prepare(
      "SELECT COUNT(*) as count FROM customers WHERE credit_balance > 0"
    ).get() as any).count;

    const topDebtors = db.prepare(`
      SELECT name, credit_balance 
      FROM customers 
      WHERE credit_balance > 0 
      ORDER BY credit_balance DESC 
      LIMIT 5
    `).all() as Array<{ name: string; credit_balance: number }>;

    return {
      total_credit: totalCredit,
      customers_with_credit: customersWithCredit,
      top_debtors: topDebtors
    };
  }

  // Get aging report
  static getAging(): CustomerAging[] {
    const customers = db.prepare(
      "SELECT * FROM customers WHERE credit_balance > 0"
    ).all() as Customer[];

    const now = new Date();
    const result: CustomerAging[] = [];

    for (const customer of customers) {
      const ledger = db.prepare(`
        SELECT * FROM customer_ledgers 
        WHERE customer_uuid = ? AND type = 'sale'
      `).all(customer.customer_uuid) as CustomerLedger[];

      const aging = {
        '0_30': 0,
        '31_60': 0,
        '61_90': 0,
        '90_plus': 0,
      };

      for (const entry of ledger) {
        const entryDate = new Date(entry.created_at);
        const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 30) aging['0_30'] += entry.amount;
        else if (daysDiff <= 60) aging['31_60'] += entry.amount;
        else if (daysDiff <= 90) aging['61_90'] += entry.amount;
        else aging['90_plus'] += entry.amount;
      }

      result.push({
        name: customer.name,
        credit_balance: customer.credit_balance,
        aging
      });
    }

    return result;
  }

  // Get payment reminders
  static getReminders(): CustomerReminder[] {
    const customers = db.prepare(
      "SELECT * FROM customers WHERE credit_balance > 0"
    ).all() as Customer[];

    const now = new Date();
    const result: CustomerReminder[] = [];

    for (const customer of customers) {
      const lastPayment = db.prepare(`
        SELECT * FROM customer_ledgers 
        WHERE customer_uuid = ? AND type = 'payment'
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(customer.customer_uuid) as CustomerLedger | undefined;

      let daysSinceLastPayment = 999;
      if (lastPayment) {
        const paymentDate = new Date(lastPayment.created_at);
        daysSinceLastPayment = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysSinceLastPayment > 15) {
        result.push({
          name: customer.name,
          mobile: customer.mobile,
          due: customer.credit_balance,
          days: daysSinceLastPayment,
        });
      }
    }

    return result;
  }

  // Record payment
  static recordPayment(customerUuid: string, amount: number, method: string): { balance: number } {
    const transaction = db.transaction(() => {
      const customer = this.findById(customerUuid);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Decrease credit balance
      db.prepare(`
        UPDATE customers 
        SET credit_balance = credit_balance - ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE customer_uuid = ?
      `).run(amount, customerUuid);

      // Create ledger entry
      db.prepare(`
        INSERT INTO customer_ledgers (
          customer_uuid, type, amount, reference_uuid, note
        ) VALUES (?, 'payment', ?, NULL, ?)
      `).run(customerUuid, amount, `Payment via ${method}`);

      const updatedCustomer = this.findById(customerUuid)!;
      return { balance: updatedCustomer.credit_balance };
    });

    return transaction();
  }
}
