import db from '../connection';

export function runMigrations(): void {
  console.log('Running migrations...');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_uuid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_name TEXT NOT NULL,
      mobile TEXT,
      address TEXT,
      gstin TEXT,
      invoice_prefix TEXT NOT NULL DEFAULT 'INV',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      product_uuid TEXT PRIMARY KEY,

      name TEXT NOT NULL,

      category_uuid TEXT,
      subcategory TEXT,

      barcode TEXT,
      sku TEXT,

      unit TEXT DEFAULT 'piece',

      price REAL NOT NULL,
      purchase_price REAL DEFAULT 0,

      gst_percent REAL NOT NULL DEFAULT 0.00,

      stock REAL NOT NULL DEFAULT 0,

      hsn_code TEXT,
      image TEXT,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (category_uuid) REFERENCES categories(category_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

    CREATE TABLE IF NOT EXISTS customers (
      customer_uuid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT,
      address TEXT,
      gstin TEXT,
      credit_balance REAL NOT NULL DEFAULT 0.00,
      credit_limit REAL NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);

    CREATE TABLE IF NOT EXISTS sales (
      sale_uuid TEXT PRIMARY KEY,
      invoice_number TEXT,
      customer_uuid TEXT,
      total REAL NOT NULL,
      tax REAL NOT NULL,
      grand_total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_uuid) REFERENCES customers(customer_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_uuid);

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_uuid TEXT NOT NULL,
      product_uuid TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      tax_percent REAL NOT NULL,
      tax_amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_uuid) REFERENCES sales(sale_uuid),
      FOREIGN KEY (product_uuid) REFERENCES products(product_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_uuid);

    CREATE TABLE IF NOT EXISTS purchases (
      purchase_uuid TEXT PRIMARY KEY,
      total REAL NOT NULL DEFAULT 0.00,
      supplier_uuid TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_uuid) REFERENCES suppliers(supplier_uuid)
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_uuid TEXT NOT NULL,
      product_uuid TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_uuid) REFERENCES purchases(purchase_uuid),
      FOREIGN KEY (product_uuid) REFERENCES products(product_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_uuid);

    CREATE TABLE IF NOT EXISTS suppliers (
      supplier_uuid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_uuid TEXT NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      reference TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_uuid) REFERENCES sales(sale_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_uuid);

    CREATE TABLE IF NOT EXISTS stock_ledgers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_uuid TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      type TEXT NOT NULL,
      reference_uuid TEXT,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_uuid) REFERENCES products(product_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_ledgers_product ON stock_ledgers(product_uuid);

    CREATE TABLE IF NOT EXISTS customer_ledgers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_uuid TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      reference_uuid TEXT,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_uuid) REFERENCES customers(customer_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_customer_ledgers_customer ON customer_ledgers(customer_uuid);

    CREATE TABLE IF NOT EXISTS carts (
      cart_uuid TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'active',
      discount REAL NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_uuid TEXT NOT NULL,
      product_uuid TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0.00,
      tax_percent REAL NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cart_uuid) REFERENCES carts(cart_uuid),
      FOREIGN KEY (product_uuid) REFERENCES products(product_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_uuid);

    CREATE TABLE IF NOT EXISTS categories (
      category_uuid TEXT PRIMARY KEY,

      name TEXT NOT NULL,
      parent_uuid TEXT,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (parent_uuid) REFERENCES categories(category_uuid)
    );

    CREATE TABLE IF NOT EXISTS attributes (
      attribute_uuid TEXT PRIMARY KEY,

      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,

      data_type TEXT NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_attributes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      product_uuid TEXT NOT NULL,
      attribute_uuid TEXT NOT NULL,

      value TEXT,

      FOREIGN KEY (product_uuid) REFERENCES products(product_uuid),
      FOREIGN KEY (attribute_uuid) REFERENCES attributes(attribute_uuid)
    );

    CREATE TABLE IF NOT EXISTS category_attributes (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      category_uuid TEXT NOT NULL,

      attribute_uuid TEXT NOT NULL,

      is_required INTEGER DEFAULT 0,

      sort_order INTEGER DEFAULT 0,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (category_uuid)
      REFERENCES categories(category_uuid),

      FOREIGN KEY (attribute_uuid)
      REFERENCES attributes(attribute_uuid)
    );

        CREATE TABLE IF NOT EXISTS product_units (

      unit_uuid TEXT PRIMARY KEY,

      product_uuid TEXT NOT NULL,

      unit_name TEXT NOT NULL,

      conversion_factor REAL NOT NULL,

      barcode TEXT,

      price REAL,

      purchase_price REAL,

      is_base_unit INTEGER DEFAULT 0,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (product_uuid)
      REFERENCES products(product_uuid)
    );

  `);

  console.log('Migrations completed successfully!');
}

if (process.argv[1] && process.argv[1].includes('001_initial')) {
  runMigrations();
  console.log('Migrations completed. Exiting...');
  process.exit(0);
}