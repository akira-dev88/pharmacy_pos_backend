export interface User {
  user_uuid: string;
  name: string;
  email: string;
  password: string;
  role: 'owner' | 'cashier' | 'manager';
  created_at: string;
  updated_at: string;
}

export interface Product {
  product_uuid: string;

  name: string;

  category_uuid?: string;
  subcategory?: string;

  barcode?: string;
  sku?: string;

  unit: string;

  price: number;
  purchase_price?: number;

  gst_percent: number;

  stock: number;

  hsn_code?: string;
  image?: string;

  created_at: string;
  updated_at: string;

  attributes?: ProductAttribute[];
}

export interface ProductUnit {

  unit_uuid: string;

  product_uuid: string;

  unit_name: string;

  conversion_factor: number;

  barcode?: string;

  price?: number;

  purchase_price?: number;

  is_base_unit: number;

  created_at: string;
}

export interface ProductUnitCreateInput {

  product_uuid: string;

  unit_name: string;

  conversion_factor: number;

  barcode?: string;

  price?: number;

  purchase_price?: number;

  is_base_unit?: number;
}

export interface ProductAttribute {
  attribute_uuid: string;

  name: string;

  value: string;
}

export interface ProductCreateInput {
  name: string;

  category_uuid?: string;
  subcategory?: string;

  barcode?: string;
  sku?: string;

  unit?: string;

  price: number;
  purchase_price?: number;

  gst_percent?: number;

  stock?: number;

  hsn_code?: string;
  image?: string;

  attributes?: {
    attribute_uuid: string;
    value: string;
  }[];
}

export interface ProductUpdateInput {

  name?: string;

  category_uuid?: string;
  subcategory?: string;

  barcode?: string;
  sku?: string;

  unit?: string;

  price?: number;
  purchase_price?: number;

  gst_percent?: number;

  stock?: number;

  hsn_code?: string;
  image?: string;

  attributes?: {
    attribute_uuid: string;
    value: string;
  }[];
}

export interface ProductSearchParams {
  q?: string;
  barcode?: string;
  sku?: string;
}


// Add these to your existing types

export interface Customer {
  customer_uuid: string;
  name: string;
  mobile?: string;
  address?: string;
  gstin?: string;
  credit_balance: number;
  credit_limit: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerLedger {
  id: number;
  customer_uuid: string;
  type: 'sale' | 'payment' | 'debit' | 'credit';
  amount: number;
  reference_uuid?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerLedgerWithBalance extends CustomerLedger {
  balance: number;
}

export interface CustomerAging {
  name: string;
  credit_balance: number;
  aging: {
    '0_30': number;
    '31_60': number;
    '61_90': number;
    '90_plus': number;
  };
}

export interface CustomerReminder {
  name: string;
  mobile?: string;
  due: number;
  days: number;
}

export interface CustomerSummary {
  total_credit: number;
  customers_with_credit: number;
  top_debtors: Array<{ name: string; credit_balance: number }>;
}

export interface Sale {
  sale_uuid: string;
  invoice_number: string;
  customer_uuid?: string;
  total: number;
  tax: number;
  grand_total: number;
  status: 'completed' | 'refunded' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: number;
  sale_uuid: string;
  product_uuid: string;
  quantity: number;
  price: number;
  tax_percent: number;
  tax_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  sale_uuid: string;
  method: 'cash' | 'upi' | 'card' | 'credit';
  amount: number;
  reference?: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  purchase_uuid: string;
  total: number;
  supplier_uuid?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: number;
  purchase_uuid: string;
  product_uuid: string;
  quantity: number;
  cost_price: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseWithRelations extends Purchase {
  items: (PurchaseItem & { product?: any })[];
  supplier?: Supplier;
}

export interface StockLedger {
  id: number;
  product_uuid: string;
  quantity: number;
  type: 'purchase' | 'sale' | 'adjustment' | 'return';
  reference_uuid?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  supplier_uuid: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface StockLedger {
  id: number;
  product_uuid: string;
  quantity: number;
  type: 'purchase' | 'sale' | 'adjustment' | 'return';
  reference_uuid?: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  id: number;
  shop_name: string;
  mobile?: string;
  address?: string;
  gstin?: string;
  invoice_prefix: string;
  created_at: string;
  updated_at: string;
  auto_print?: number;
}

export interface Cart {
  cart_uuid: string;
  status: 'active' | 'held' | 'completed' | 'cancelled';
  discount: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  cart_uuid: string;
  product_uuid: string;
  quantity: number;
  price: number;
  discount: number;
  tax_percent: number;
  created_at: string;
  updated_at: string;
}

export interface CartWithItems extends Cart {
  items: (CartItem & { product?: Product })[];
  summary: CartSummary;
}

export interface CartSummary {
  total: number;
  item_discount: number;
  bill_discount: number;
  tax: number;
  grand_total: number;
}
