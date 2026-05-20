<!-- PHASE 4 — Purchase System

(VERY IMPORTANT)

Hardware inventory is purchase-heavy.

You need:

supplier
purchase invoice
purchase items
cost price history

You already partially have this.

Now connect it properly. -->

<!-- PHASE 2 — Better Search

(VERY IMPORTANT)

Hardware shops survive on search speed.

You need:

Tokenized search

Example:

3/4 cpvc pipe

Should find:

Ashirvad CPVC Pipe 3/4 inch
Improve Search Like This

Create:

search_text

column.

Example:

ashirvad cpvc pipe 3/4 inch 10 feet

Then:

LIKE '%cpvc%'
LIKE '%3/4%'

becomes fast and easy.

This matters MASSIVELY. -->

markdown
# POS Billing System - API Documentation

A comprehensive Point of Sale (POS) billing system backend built with Node.js, Express, TypeScript, and SQLite.

## 📋 Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Modules](#api-modules)
  - [Auth](#auth)
  - [Products](#products)
  - [Carts](#carts)
  - [Sales](#sales)
  - [Customers](#customers)
  - [Suppliers](#suppliers)
  - [Purchases](#purchases)
  - [Settings](#settings)
  - [Staff](#staff)
  - [Reports](#reports)
- [Error Codes](#error-codes)

---

## Base URL
http://localhost:3000/api

text

## Authentication

All protected endpoints require a JWT token in the Authorization header:
Authorization: Bearer YOUR_JWT_TOKEN

text

---

Error Codes
| Status Code | Description |
|-------------|-------------|
| 200 | OK - Successful request |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input/validation error |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

Error Response Format
```
{
  "success": false,
  "error": "Error message description"
}
```

### User Roles
Role	Description	Permissions
owner	Shop owner/admin	Full access to all features
manager	Store manager	Sales, reports, product management
cashier	Counter staff	POS operations, cart checkout

---

## API Modules

---

### Auth

Authentication endpoints for user registration and login.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new shop & admin | No |
| POST | `/auth/login` | Login user | No |
| GET | `/auth/me` | Get current user profile | Yes |
| POST | `/auth/logout` | Logout user | Yes |

#### Register New Shop & Admin

`POST /api/auth/register`

Request Body

```
{
  "shop_name": "My Shop",
  "name": "Admin",
  "email": "admin@test.com",
  "password": "123456"
}

```


Response 201 Created

```
{
  "user": {
    "user_uuid": "uuid-here",
    "name": "Admin",
    "email": "admin@test.com",
    "role": "owner"
  },
  "shop": {
    "id": 1,
    "shop_name": "My Shop",
    "invoice_prefix": "INV"
  },
  "token": "jwt-token-here"
}

```

#### Login

`POST /api/auth/login`

Request Body

```
{
  "email": "admin@test.com",
  "password": "123456"
} 
```

Response 200 OK

```
{
  "user": {
    "user_uuid": "uuid-here",
    "name": "Admin",
    "email": "admin@test.com",
    "role": "owner"
  },
  "shop": {
    "id": 1,
    "shop_name": "My Shop"
  },
  "token": "jwt-token-here"
}
```

### Products
Product management endpoints.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/products` | List all products | Yes |
| GET | `/products/search?q=` | Search products by name | Yes |
| GET | `/products/barcode/:barcode` | Find product by barcode | Yes |
| GET | `/products/sku/:sku` | Find product by SKU | Yes |
| GET | `/products/low-stock?threshold=10` | Get low stock products | Yes |
| POST | `/products` | Create product | Yes |
| POST | `/products/bulk` | Bulk create products | Yes |
| GET | `/products/:uuid` | Get single product | Yes |
| PUT | `/products/:uuid` | Update product | Yes |
| DELETE | `/products/:uuid` | Delete product | Yes |

#### SEARCH:

`GET /products/search?q=paracetamol`

`GET /products/search?q=Micro`

#### Create Product

`POST /api/products`

Request Body
```
{
  "name": "Dolo 650",
  "barcode": "8901234567890",
  "product_type": "medicine",
  "manufacturer": "Micro Labs",
  "composition": "Paracetamol 650mg",
  "schedule_type": "H",
  "prescription_required": 0,
  "medicine_type": "tablet",
  "rack_location": "A-12",
  "unit": "strip",
  "price": 32,
  "purchase_price": 24,
  "gst_percent": 12,
  "stock": 100
}
```
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Product name |
| price | number | Yes | Selling price |
| barcode | string | No | Barcode number |
| sku | string | No | Stock Keeping Unit |
| gst_percent | number | No | GST percentage (default: 0) |
| stock | number | No | Initial stock quantity (default: 0) |

Response 201 Created

```
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product_uuid": "uuid-here",
    "name": "Product Name",
    "barcode": "123456789",
    "sku": "SKU001",
    "price": 99.99,
    "gst_percent": 18,
    "stock": 50,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

List Products (Paginated)

`GET /api/products?page=1&limit=20`

Response 200 OK

```
{
  "success": true,
  "data": [ /* array of products */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```
#### Search Products

`GET /api/products/search?q=Product`

Response 200 OK
```
{
  "success": true,
  "data": [ /* array of matching products */ ],
  "count": 5
}
```

#### Find by Barcode


`GET /api/products/barcode/123456789`

Find by SKU

`GET /api/products/sku/SKU001`

Update Product

`PUT /api/products/:uuid`

Request Body (All fields optional)

```
{
  "name": "Updated Name",
  "price": 149.99,
  "stock": 100
}
```
Delete Product

`DELETE /api/products/:uuid`

Get Low Stock Products

`GET /api/products/low-stock?threshold=10`

Bulk Create Products

`POST /api/products/bulk`

Request Body
```
{
  "products": [
    {"name": "Product A", "price": 10.99},
    {"name": "Product B", "price": 20.99},
    {"name": "Product C", "price": 15.99}
  ]
}
```

### Batch 

`GET /api/product-batches/product/YOUR_PRODUCT_UUID`

`POST /api/product-batches`

```
{
  "product_uuid": "YOUR_PRODUCT_UUID",

  "batch_number": "DOLO-001",

  "expiry_date": "2027-12-31",

  "manufacture_date": "2025-01-01",

  "mrp": 32,

  "ptr": 24,

  "rate": 22,

  "purchase_price": 22,

  "selling_price": 32,

  "gst_percent": 12,

  "quantity": 100,

  "free_quantity": 10
}
```

STOCK UPDATE

`PUT /api/product-batches`
```
{
  "product_uuid": "b3b8a257-ce93-4e52-83b2-421e52e84d75",
  "batch_number": "DOLO-002",
  "expiry_date": "2028-01-01",
  "mrp": 32,
  "quantity": 50
}
```

//automatic FEFO allocation

B1 -> 5
B2 -> 3

`POST /api/product-batche`s
```
{
  "product_uuid": "b3b8a257-ce93-4e52-83b2-421e52e84d75",
  "batch_number": "DOLO-A",
  "expiry_date": "2027-01-01",
  "mrp": 32,
  "quantity": 5
}
```

`POST /api/product-batches`
```
{
  "product_uuid": "b3b8a257-ce93-4e52-83b2-421e52e84d75",
  "batch_number": "DOLO-B",
  "expiry_date": "2027-01-01",
  "mrp": 32,
  "quantity": 10
}
```
`POST /api/product-batches/consume-fefo`

```
{
  "product_uuid": "b3b8a257-ce93-4e52-83b2-421e52e84d75",
  "quantity": 8
}
```
respose

```
{
    "success": true,
    "data": [
        {
            "batch_uuid": "972ae3d6-4657-4393-af8e-3b50132e26c0",
            "quantity": 5
        },
        {
            "batch_uuid": "4052702a-4385-46d8-856f-0df9fd7b3a32",
            "quantity": 3
        }
    ]
}
```

| Batch  | Remaining |
| ------ | --------- |
| DOLO-A | 0         |
| DOLO-B | 7         |

`GET /api/product-batches/near-expiry`
```
{
    "success": true,
    "count": 1,
    "data": [
        {
            "batch_uuid": "523f50d2-ec76-4c03-aeee-985edb73bf14",
            "product_uuid": "9b43935c-63b8-492b-8617-c11e5d0dfad1",
            "product_name": "Dolo 650",
            "batch_number": "DOLO-A",
            "expiry_date": "2026-05-30",
            "remaining_qty": 5,
            "days_left": 9
        }
    ]
}
```

### STOCK ADJUSTMENT

`POST /api/stock-adjustments`
```
{
  "product_uuid": "9b43935c-63b8-492b-8617-c11e5d0dfad1",
  "batch_uuid": "523f50d2-ec76-4c03-aeee-985edb73bf14",
  "adjustment_type": "damage",
  "quantity": 2,
  "note": "Broken strip"
}
```


--
### Carts
Shopping cart management for POS transactions.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/carts` | Create new cart | Yes |
| GET | `/carts/held` | Get held carts | Yes |
| GET | `/carts/:cart_uuid` | Get cart with items & summary | Yes |
| POST | `/carts/:cart_uuid/items` | Add item to cart | Yes |
| PUT | `/carts/:cart_uuid/items/:product_uuid` | Update cart item | Yes |
| DELETE | `/carts/:cart_uuid/items/:product_uuid` | Remove item from cart | Yes |
| POST | `/carts/:cart_uuid/discount` | Apply bill discount | Yes |
| POST | `/carts/:cart_uuid/hold` | Hold cart | Yes |
| POST | `/carts/:cart_uuid/resume` | Resume held cart | Yes |
| POST | `/carts/:cart_uuid/clear` | Clear all items | Yes |
| POST | `/carts/:cart_uuid/checkout` | Checkout cart (Owner/Manager/Cashier) | Yes |

Create Cart

`POST /api/carts`

Response 201 Created

```
{
  "success": true,
  "message": "Cart created successfully",
  "data": {
    "cart_uuid": "uuid-here",
    "status": "active",
    "discount": 0.00,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

Get Cart with Items & Summary

`GET /api/carts/:cart_uuid`

Response 200 OK

```
{
  "success": true,
  "data": {
    "cart_uuid": "uuid-here",
    "status": "active",
    "discount": 10.00,
    "items": [
      {
        "id": 1,
        "product_uuid": "uuid-here",
        "quantity": 2,
        "price": 99.99,
        "discount": 0.00,
        "tax_percent": 18,
        "product": {
          "name": "Product Name",
          "barcode": "123456789"
        }
      }
    ],
    "summary": {
      "total": 199.98,
      "item_discount": 0.00,
      "bill_discount": 10.00,
      "tax": 34.20,
      "grand_total": 224.18
    }
  }
}
```
Add Item to Cart

`POST /api/carts/:cart_uuid/items`

Request Body
```
{
  "product_uuid": "product-uuid-here",
  "quantity": 2
}
```
Update Cart Item

`PUT /api/carts/:cart_uuid/items/:product_uuid`

Request Body
```
{
  "quantity": 5,
  "price": 89.99,
  "discount": 5.00,
  "tax_percent": 12
}
```

Remove Item from Cart

`DELETE /api/carts/:cart_uuid/items/:product_uuid`

Apply Bill Discount

`POST /api/carts/:cart_uuid/discount`

Request Body
```
{
  "discount": 50.00
}
```
Hold Cart

`POST /api/carts/:cart_uuid/hold`

Resume Held Cart

`POST /api/carts/:cart_uuid/resume`

Clear Cart

`POST /api/carts/:cart_uuid/clear`

Checkout Cart

`POST /api/carts/:cart_uuid/checkout`

Request Body
```
{
  "customer_uuid": "uuid",
  "payments": [
    {
      "method": "cash",
      "amount": 71.68
    }
  ],
  "prescriptions": [
    {
      "product_uuid": "uuid",
      "prescription_number": "RX-1001",
      "doctor_name": "Dr Kumar",
      "doctor_license": "TNMC-12345",
      "patient_name": "Ravi",
      "patient_age": 32,
      "patient_gender": "male"
    }
  ]
}
```

Payment Methods: cash, upi, card, credit

Response 201 Created
```
{
  "success": true,
  "message": "Checkout successful",
  "data": {
    "sale_uuid": "uuid-here",
    "invoice_number": "INV-00001",
    "customer_uuid": "customer-uuid-here",
    "total": 599.97,
    "tax": 68.39,
    "grand_total": 648.36,
    "status": "completed",
    "items": [ /* array of sale items */ ],
    "payments": [ /* array of payments */ ]
  }
}
```

### Sales
Sale transaction management.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/sales` | List all sales | Yes |
| POST | `/sales` | Direct sale (without cart) | Yes |
| GET | `/sales/:sale_uuid` | Get sale details | Yes |
| GET | `/sales/:sale_uuid/invoice` | Get invoice details | Yes |

List Sales

`GET /api/sales?page=1&limit=20`

Response 200 OK
```
{
  "success": true,
  "data": [ /* array of sales */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Direct Sale

`POST /api/sales`

Request Body
```
{
  "customer_uuid": "optional-customer-uuid",
  "items": [
    {
      "product_uuid": "product-uuid-1",
      "quantity": 5
    },
    {
      "product_uuid": "product-uuid-2",
      "quantity": 3
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 1000.00
    }
  ]
}
```

Get Invoice

`GET /api/sales/:sale_uuid/invoice`

Response 200 OK
```
{
  "shop": {
    "name": "My Shop",
    "mobile": "9876543210",
    "address": "123 Main St, City",
    "gstin": "GSTIN123456"
  },
  "invoice_number": "INV-00001",
  "date": "2024-01-15T10:30:00.000Z",
  "customer": {
    "name": "John Doe",
    "mobile": "9876543210"
  },
  "items": [
    {
      "name": "Product 1",
      "qty": 2,
      "price": 99.99,
      "total": 199.98,
      "tax_percent": 18,
      "tax_amount": 36.00
    }
  ],
  "summary": {
    "total": 199.98,
    "tax": 36.00,
    "cgst": 18.00,
    "sgst": 18.00,
    "grand_total": 235.98
  },
  "payments": [
    {
      "method": "cash",
      "amount": 235.98
    }
  ]
}
```
### Customers
Customer management and credit tracking.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/customers` | List all customers | Yes |
| GET | `/customers/search?q=` | Search customers | Yes |
| GET | `/customers/summary` | Get credit summary | Yes |
| GET | `/customers/aging` | Get credit aging report | Yes |
| GET | `/customers/reminders` | Get payment reminders | Yes |
| POST | `/customers` | Create customer | Yes |
| GET | `/customers/:customer_uuid` | Get customer details | Yes |
| PUT | `/customers/:customer_uuid` | Update customer | Yes |
| DELETE | `/customers/:customer_uuid` | Delete customer | Yes |
| GET | `/customers/:customer_uuid/ledger` | Get customer ledger | Yes |
| POST | `/customers/:customer_uuid/payments` | Record payment | Yes |

Create Customer

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Customer name |
| mobile | string | No | Phone number |
| address | string | No | Address |
| gstin | string | No | GST number |
| credit_limit | number | No | Maximum credit allowed (default: 0) |


`POST /api/customers`

Request Body
```
{
  "name": "John Doe",
  "mobile": "9876543210",
  "address": "123 Main St, City",
  "gstin": "GST123456",
  "credit_limit": 10000
}
```

Response 201 Created

```
{
  "success": true,
  "data": {
    "customer_uuid": "uuid-here",
    "name": "John Doe",
    "mobile": "9876543210",
    "address": "123 Main St, City",
    "gstin": "GST123456",
    "credit_balance": 0.00,
    "credit_limit": 10000.00,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}

```
Record Customer Payment

`POST /api/customers/:customer_uuid/payments`

Request Body

```
{
  "amount": 500.00,
  "method": "cash"
}
```
Get Customer Ledger

`GET /api/customers/:customer_uuid/ledger`

Response 200 OK

```
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_uuid": "uuid-here",
      "type": "sale",
      "amount": 1000.00,
      "reference_uuid": "sale-uuid-here",
      "note": "Sale invoice #INV-00001",
      "balance": 1000.00,
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "customer_uuid": "uuid-here",
      "type": "payment",
      "amount": 500.00,
      "reference_uuid": null,
      "note": "Payment via cash",
      "balance": 500.00,
      "created_at": "2024-01-16T10:30:00.000Z"
    }
  ]
}
```
Get Customer Summary

`GET /api/customers/summary`
Response 200 OK
```
{
  "success": true,
  "data": {
    "total_credit": 25000.00,
    "customers_with_credit": 5,
    "top_debtors": [
      {
        "name": "John Doe",
        "credit_balance": 10000.00
      },
      {
        "name": "Jane Smith",
        "credit_balance": 7500.00
      }
    ]
  }
}
```

Get Aging Report

`GET /api/customers/aging`

Response 200 OK
```
{
  "success": true,
  "data": [
    {
      "name": "John Doe",
      "credit_balance": 10000.00,
      "aging": {
        "0_30": 3000.00,
        "31_60": 5000.00,
        "61_90": 2000.00,
        "90_plus": 0.00
      }
    }
  ]
}
```
Get Payment Reminders

`GET /api/customers/reminders`

Response 200 OK
```
{
  "success": true,
  "data": [
    {
      "name": "John Doe",
      "mobile": "9876543210",
      "due": 10000.00,
      "days": 30
    }
  ]
}
```

## Suppliers

#### Supplier/vendor management.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/suppliers` | List all suppliers | Yes |
| POST | `/suppliers` | Create supplier | Yes |
| PUT | `/suppliers/:supplier_uuid` | Update supplier | Yes |
| DELETE | `/suppliers/:supplier_uuid` | Delete supplier | Yes |

List Suppliers

`GET /api/suppliers`

Response 200 OK
```
[
  {
    "supplier_uuid": "uuid-here",
    "name": "ABC Supplies",
    "phone": "9876543210",
    "email": "abc@supplies.com",
    "address": "123 Business Park, Mumbai",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
]
```
Create Supplier

`POST /api/suppliers`

Request Body
```
{
  "name": "ABC Supplies",
  "phone": "9876543210",
  "email": "abc@supplies.com",
  "address": "123 Business Park, Mumbai"
}
```

Update Supplier

`PUT /api/suppliers/:supplier_uuid`

Request Body (All fields optional)
```
{
  "name": "Updated Name",
  "phone": "9999999999"
}
```

Delete Supplier

`DELETE /api/suppliers/:supplier_uuid`

Response 200 OK
```
{
  "message": "Deleted"
}
```

## Purchases

### Purchase order management.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/purchases` | List all purchases | Yes |
| POST | `/purchases` | Create purchase | Yes |

Create Purchase

`POST /api/purchases`

Request Body
```
{
  "supplier_uuid": "supplier-uuid-here",
  "items": [
    {
      "product_uuid": "product-uuid-1",
      "quantity": 10,
      "cost_price": 50.00
    },
    {
      "product_uuid": "product-uuid-2",
      "quantity": 5,
      "cost_price": 75.00
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| supplier_uuid | UUID | No | Supplier identifier |
| items | array | Yes | Array of purchase items |
| items[].product_uuid | UUID | Yes | Product identifier |
| items[].quantity | number | Yes | Quantity purchased (min: 1) |
| items[].cost_price | number | Yes | Cost price per unit (min: 0) |

Response 201 Created
```
{
  "success": true,
  "message": "Purchase created",
  "data": {
    "purchase_uuid": "uuid-here",
    "total": 875.00,
    "supplier_uuid": "supplier-uuid-here",
    "items": [
      {
        "id": 1,
        "purchase_uuid": "uuid-here",
        "product_uuid": "product-uuid-1",
        "quantity": 10,
        "cost_price": 50.00,
        "product": {
          "name": "Product 1"
        }
      }
    ],
    "supplier": {
      "supplier_uuid": "supplier-uuid-here",
      "name": "ABC Supplies"
    }
  }
}
```

List Purchases

`GET /api/purchases`

Response 200 OK
```
[
  {
    "purchase_uuid": "uuid-here",
    "total": 875.00,
    "supplier_uuid": "supplier-uuid-here",
    "items": [ /* array of purchase items with product details */ ],
    "supplier": {
      "supplier_uuid": "supplier-uuid-here",
      "name": "ABC Supplies"
    }
  }
]
```

# Settings
Shop settings management (Owner only for create/update).


| Field | Type | Required | Description |
|-------|------|----------|-------------|
| shop_name | string | Yes | Shop/Store name |
| mobile | string | No | Contact number |
| address | string | No | Shop address |
| gstin | string | No | GST number (India) |
| invoice_prefix | string | No | Invoice number prefix (default: INV) |

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/settings` | Get shop settings | Yes | Any |
| POST | `/settings` | Create/Update settings | Yes | Owner |
| PUT | `/settings` | Update settings | Yes | Owner |

`GET /api/settings`

Response 200 OK
```
{
  "success": true,
  "data": {
    "id": 1,
    "shop_name": "My Shop",
    "mobile": "9876543210",
    "address": "123 Main St, City",
    "gstin": "GSTIN123456",
    "invoice_prefix": "INV",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

Save/Create Settings

`POST /api/settings`

Request Body
```
{
  "shop_name": "My Shop",
  "mobile": "9876543210",
  "address": "123 Main St, City",
  "gstin": "GSTIN123456",
  "invoice_prefix": "INV"
}
```

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/staff` | List all staff | Yes | Owner |
| GET | `/staff/summary` | Staff summary | Yes | Owner |
| GET | `/staff/role/:role` | Staff by role | Yes | Owner |
| POST | `/staff` | Create staff | Yes | Owner |
| PUT | `/staff/:user_uuid` | Update staff | Yes | Owner |
| DELETE | `/staff/:user_uuid` | Delete staff | Yes | Owner |

# Staff Member

Create Staff Member

`POST /api/staff`

Request Body
```
{
  "name": "John Cashier",
  "email": "cashier@test.com",
  "password": "123456",
  "role": "cashier"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Staff name |
| email | string | Yes | Unique email |
| password | string | Yes | Password (min: 6 chars) |
| role | string | Yes | Role: manager or cashier |

Response 201 Created
```
{
  "user_uuid": "uuid-here",
  "name": "John Cashier",
  "email": "cashier@test.com",
  "role": "cashier",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

List All Staff

`GET /api/staff`

Response 200 OK
```
[
  {
    "user_uuid": "uuid-here",
    "name": "John Cashier",
    "email": "cashier@test.com",
    "role": "cashier",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
]
```

Update Staff Member

`PUT /api/staff/:user_uuid`

Request Body (All fields required for update)
```
{
  "name": "John Updated",
  "email": "cashier2@test.com",
  "role": "manager",
  "password": "newpassword"
}
```

Delete Staff Member

`DELETE /api/staff/:user_uuid`

Response 200 OK
```
{
  "message": "Staff deleted"
}
```

Staff Summary

`GET /api/staff/summary`

Response 200 OK
```
{
  "staff_by_role": [
    { "role": "manager", "count": 2 },
    { "role": "cashier", "count": 5 }
  ],
  "total_staff": 7
}
```

Staff by Role

`GET /api/staff/role/cashier`

# Reports
Analytics and reporting endpoints.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/reports/dashboard` | Dashboard summary | Yes |
| GET | `/reports/top-products` | Top selling products | Yes |
| GET | `/reports/stock` | Stock report | Yes |
| GET | `/reports/profit` | Profit estimation | Yes |
| GET | `/reports/sales-trend` | Sales trend (7 days) | Yes |
| GET | `/reports/profit-trend` | Profit trend (7 days) | Yes |
| GET | `/reports/sales-by-payment` | Sales by payment method | Yes |
| GET | `/reports/daily-sales` | Daily sales summary | Yes |
| GET | `/reports/product-sales` | Product sales report | Yes |
| GET | `/reports/customer-purchases` | Customer purchase history | Yes |

Dashboard

`GET /api/reports/dashboard`

Response 200 OK
```
{
  "today_sales": 5000.00,
  "month_sales": 125000.00,
  "total_sales": 1500000.00,
  "total_orders": 500,
  "recent_sales": [ /* last 5 sales */ ],
  "low_stock": [ /* products with stock < 10 */ ],
  "top_products": [
    {
      "name": "Product A",
      "total_qty": 150
    }
  ],
  "recent_purchases": [ /* last 5 purchases */ ]
}
```

Top Products

`GET /api/reports/top-products`

Stock Report

`GET /api/reports/stock`

Response 200 OK
```
[
  {
    "name": "Product A",
    "stock": 25,
    "price": 99.99
  }
]
```

Profit Estimation

`GET /api/reports/profit`

Response 200 OK
```
{
  "revenue": 1500000.00,
  "cost": 1000000.00,
  "profit": 500000.00
}
```

Sales Trend (Last 7 Days)

`GET /api/reports/sales-trend`

Response 200 OK
```
[
  {
    "date": "2024-01-09",
    "total": 5000.00
  },
  {
    "date": "2024-01-10",
    "total": 7500.00
  }
]
```

Profit Trend (Last 7 Days)

`GET /api/reports/profit-trend`

Response 200 OK
```
[
  {
    "date": "2024-01-09",
    "revenue": 5000.00,
    "cost": 3000.00,
    "profit": 2000.00
  }
]
```

Sales by Payment Method

`GET /api/reports/sales-by-payment?startDate=2024-01-01&endDate=2024-01-31`

Daily Sales Summary

`GET /api/reports/daily-sales?days=30`

Product Sales Report

`GET /api/reports/product-sales?startDate=2024-01-01&endDate=2024-01-31`

Customer Purchase Report

`GET /api/reports/customer-purchases`
