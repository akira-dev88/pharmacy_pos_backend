import db from '../database/connection';

export class ReportModel {
  // Dashboard summary
  static getDashboard() {
    const now = new Date();

    // Get today's date in local time (IST)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // Get month start date in local time
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Alternative: Use SQLite's date functions with localtime
    // Today's sales - using DATE() with localtime
    const todaySales = (db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total 
        FROM sales 
        WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')
    `).get() as any).total;

    // This month's sales - using DATE() with localtime
    const monthSales = (db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total 
        FROM sales 
        WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
    `).get() as any).total;

    // Alternative method using string comparison (more reliable)
    // Today's sales alternative method
    const todaySalesAlt = (db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total 
        FROM sales 
        WHERE created_at LIKE '${todayStr}%'
    `).get() as any).total;

    // Total sales (all time)
    const totalSales = (db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total 
        FROM sales
    `).get() as any).total;

    // Total orders
    const totalOrders = (db.prepare(`
        SELECT COUNT(*) as count 
        FROM sales
    `).get() as any).count;

    // Recent sales (last 5)
    const recentSales = db.prepare(`
        SELECT s.*, c.name as customer_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_uuid = c.customer_uuid
        ORDER BY s.created_at DESC
        LIMIT 5
    `).all();

    // Low stock products (stock < 10)
    const lowStock = db.prepare(`
        SELECT * FROM products 
        WHERE stock < 10
        ORDER BY stock ASC
    `).all();

    // Top 5 products by quantity sold
    const topProducts = db.prepare(`
        SELECT 
            p.name,
            p.product_uuid,
            SUM(si.quantity) as total_qty
        FROM sale_items si
        JOIN sales s ON si.sale_uuid = s.sale_uuid
        LEFT JOIN products p ON si.product_uuid = p.product_uuid
        GROUP BY si.product_uuid
        ORDER BY total_qty DESC
        LIMIT 5
    `).all();

    // Recent purchases (last 5)
    const recentPurchases = db.prepare(`
        SELECT p.*, s.name as supplier_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_uuid = s.supplier_uuid
        ORDER BY p.created_at DESC
        LIMIT 5
    `).all();

    console.log('Debug - Dashboard calculations:', {
      todayStr,
      todaySales,
      monthStartStr,
      monthSales,
      totalSales
    });

    return {
      today_sales: todaySales || 0,
      month_sales: monthSales || 0,
      total_sales: totalSales || 0,
      total_orders: totalOrders || 0,
      recent_sales: recentSales,
      low_stock: lowStock,
      top_products: topProducts.map((p: any) => ({
        name: p.name || 'Unknown',
        total_qty: p.total_qty
      })),
      recent_purchases: recentPurchases
    };
  }

  // Top products report
  static getTopProducts() {
    const topProducts = db.prepare(`
      SELECT 
        p.product_uuid,
        p.name,
        p.barcode,
        p.sku,
        p.price,
        p.stock,
        SUM(si.quantity) as total_qty,
        SUM(si.price * si.quantity) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_uuid = s.sale_uuid
      LEFT JOIN products p ON si.product_uuid = p.product_uuid
      GROUP BY si.product_uuid
      ORDER BY total_qty DESC
      LIMIT 5
    `).all();

    return topProducts.map((item: any) => ({
      product_uuid: item.product_uuid,
      name: item.name || 'Unknown',
      barcode: item.barcode,
      sku: item.sku,
      price: item.price,
      stock: item.stock,
      total_qty: item.total_qty,
      total_revenue: Math.round(item.total_revenue * 100) / 100
    }));
  }

  // Stock report
  static getStockReport() {
    return db.prepare(`
      SELECT name, stock, price 
      FROM products
      ORDER BY name ASC
    `).all();
  }

  // Profit estimation
  static getProfit() {
    // Calculate total revenue from sales
    const revenue = (db.prepare(`
      SELECT COALESCE(SUM(si.price * si.quantity), 0) as total
      FROM sale_items si
      JOIN sales s ON si.sale_uuid = s.sale_uuid
    `).get() as any).total;

    // Calculate total cost from purchases
    const cost = (db.prepare(`
      SELECT COALESCE(SUM(pi.cost_price * pi.quantity), 0) as total
      FROM purchase_items pi
      JOIN purchases p ON pi.purchase_uuid = p.purchase_uuid
    `).get() as any).total;

    const revenueNum = Number(revenue) || 0;
    const costNum = Number(cost) || 0;

    return {
      revenue: Math.round(revenueNum * 100) / 100,
      cost: Math.round(costNum * 100) / 100,
      profit: Math.round((revenueNum - costNum) * 100) / 100
    };
  }

  // Sales trend (last 7 days)
  static getSalesTrend() {
    const dates: string[] = [];
    const now = new Date();

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Get sales data grouped by date
    const salesData = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        SUM(grand_total) as total
      FROM sales
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(dates[0]) as Array<{ date: string; total: number }>;

    // Map to all 7 days with 0 for missing days
    return dates.map(date => {
      const dayData = salesData.find((d: any) => d.date === date);
      return {
        date,
        total: dayData ? Number(dayData.total) : 0
      };
    });
  }

  // Profit trend (last 7 days)
  static getProfitTrend() {
    const dates: string[] = [];
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Get sales per day
    const salesByDay = db.prepare(`
      SELECT 
        DATE(s.created_at) as date,
        COALESCE(SUM(si.price * si.quantity), 0) as revenue
      FROM sales s
      JOIN sale_items si ON s.sale_uuid = si.sale_uuid
      WHERE s.created_at >= ?
      GROUP BY DATE(s.created_at)
    `).all(startDateStr) as Array<{ date: string; revenue: number }>;

    // Get purchases per day
    const purchasesByDay = db.prepare(`
      SELECT 
        DATE(p.created_at) as date,
        COALESCE(SUM(pi.cost_price * pi.quantity), 0) as cost
      FROM purchases p
      JOIN purchase_items pi ON p.purchase_uuid = pi.purchase_uuid
      WHERE p.created_at >= ?
      GROUP BY DATE(p.created_at)
    `).all(startDateStr) as Array<{ date: string; cost: number }>;

    // Create maps for quick lookup
    const salesMap = new Map(salesByDay.map((d: any) => [d.date, Number(d.revenue)]));
    const purchasesMap = new Map(purchasesByDay.map((d: any) => [d.date, Number(d.cost)]));

    // Build result for all 7 days
    return dates.map(date => {
      const revenue = salesMap.get(date) || 0;
      const cost = purchasesMap.get(date) || 0;

      return {
        date,
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        profit: Math.round((revenue - cost) * 100) / 100
      };
    });
  }

  // Additional useful reports

  // Sales by payment method
  static getSalesByPaymentMethod(startDate?: string, endDate?: string) {
    let query = `
      SELECT 
        method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }

    query += ' GROUP BY method ORDER BY total DESC';

    return db.prepare(query).all(...params);
  }

  // Daily sales summary for date range
  static getDailySalesSummary(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    return db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total,
        COALESCE(SUM(tax), 0) as tax,
        COALESCE(SUM(grand_total), 0) as grand_total
      FROM sales
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all(startDateStr);
  }

  // Product sales report
  static getProductSalesReport(startDate?: string, endDate?: string) {
    let query = `
      SELECT 
        p.product_uuid,
        p.name,
        p.barcode,
        p.sku,
        COUNT(DISTINCT si.sale_uuid) as order_count,
        COALESCE(SUM(si.quantity), 0) as total_qty,
        COALESCE(SUM(si.price * si.quantity), 0) as total_revenue,
        COALESCE(SUM(si.tax_amount), 0) as total_tax
      FROM sale_items si
      JOIN sales s ON si.sale_uuid = s.sale_uuid
      JOIN products p ON si.product_uuid = p.product_uuid
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
      query += ' AND s.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND s.created_at <= ?';
      params.push(endDate);
    }

    query += `
      GROUP BY si.product_uuid
      ORDER BY total_revenue DESC
    `;

    return db.prepare(query).all(...params);
  }

  // Customer purchase history
  static getCustomerPurchaseReport() {
    return db.prepare(`
      SELECT 
        c.customer_uuid,
        c.name,
        c.mobile,
        COUNT(s.sale_uuid) as purchase_count,
        COALESCE(SUM(s.grand_total), 0) as total_spent,
        c.credit_balance
      FROM customers c
      LEFT JOIN sales s ON c.customer_uuid = s.customer_uuid
      GROUP BY c.customer_uuid
      ORDER BY total_spent DESC
    `).all();
  }
}
