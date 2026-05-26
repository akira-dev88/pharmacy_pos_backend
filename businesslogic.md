# Auth
POST /api/auth/register

{
  "shop_name": "My Shop",
  "name": "Admin",
  "email": "admin@test.com",
  "password": "123456"
}

POST /api/auth/login

{
  "email": "admin@test.com",
  "password": "123456"
} 


# Create Root Category

POST /categories

Business Meaning

Create top-level medicine group.

Example:

Medicines
Surgical
FMCG
Ayurvedic

Request Body:

{
  "name": "Medicines",
  "description": "All pharmaceutical medicines"
}

Response:

{
    "success": true,
    "data": {
        "category_uuid": "715da1d6-13d5-4769-b2b1-0384a29b85cd",
        "name": "Medicines",
        "parent_uuid": null,
        "created_at": "2026-05-25 14:13:20"
    }
}

## Create Subcategory

Now pharmacy creates:

    Tablets

        under:

            Medicines

POST /categories

Request:

{
  "name": "Tablets",
  "parent_uuid": "cat_root_001",
  "description": "Solid oral medicines"
}

Response:

{
    "success": true,
    "data": {
        "category_uuid": "f3fd518c-fd73-48e5-8c0e-a6ee4a267fb0",
        "name": "Tablets",
        "parent_uuid": "715da1d6-13d5-4769-b2b1-0384a29b85cd",
        "created_at": "2026-05-25 14:15:42"
    }
}

## Create Medical Use Case Category

Now pharmacy creates:
    Fever
        under:
            Tablets

POST /categories

Request:

{
  "name": "Fever",
  "parent_uuid": "cat_tab_001",
  "description": "Fever management medicines"
}

Response:

{
    "success": true,
    "data": {
        "category_uuid": "897309e6-ffd1-4c94-9917-cab3a645f522",
        "name": "Fever",
        "parent_uuid": "f3fd518c-fd73-48e5-8c0e-a6ee4a267fb0",
        "created_at": "2026-05-25 14:18:54"
    }
}

FINAL CATEGORY TREE

Medicines
   ↓
Tablets
   ↓
Fever

Now:

    Dolo 650 can belong here.

<!-- WHY THIS MATTERS

Because pharmacies search medicines by:

dosage form,
disease,
compliance category,
storage type.

This hierarchy supports all of that. -->

## List Categories

GET /categories

{
    "success": true,
    "data": [
        {
            "category_uuid": "897309e6-ffd1-4c94-9917-cab3a645f522",
            "name": "Fever",
            "parent_uuid": "f3fd518c-fd73-48e5-8c0e-a6ee4a267fb0",
            "created_at": "2026-05-25 14:18:54"
        },
        {
            "category_uuid": "715da1d6-13d5-4769-b2b1-0384a29b85cd",
            "name": "Medicines",
            "parent_uuid": null,
            "created_at": "2026-05-25 14:13:20"
        },
        {
            "category_uuid": "f3fd518c-fd73-48e5-8c0e-a6ee4a267fb0",
            "name": "Tablets",
            "parent_uuid": "715da1d6-13d5-4769-b2b1-0384a29b85cd",
            "created_at": "2026-05-25 14:15:42"
        }
    ]
}

Frontend UX Implication

Frontend should render:

hierarchical category picker.

NOT flat dropdown.

HIDDEN BUSINESS RULES IN YOUR BACKEND

Your architecture reveals several important pharmacy concepts.

1. Categories Are Organizational

NOT inventory entities.

They:

classify products,
organize search,
improve reporting.
2. Products Belong To Categories

Example:

Dolo 650
   ↓
Fever
3. Categories Enable Dynamic Attributes

Later:

Tablets
   ↓
Dosage
Strength
Coating

while:

Syrups
   ↓
Flavor
Bottle Size

This is VERY powerful architecture.

4. Categories Support Scalable Pharmacy Growth

Small pharmacy:

Medicines

Large pharmacy:

Medicines
  ├── Tablets
  ├── Syrups
  ├── Antibiotics
  ├── Cold Storage
  ├── Schedule H
  └── Pediatric
FRONTEND MENTAL MODEL

The frontend developer MUST understand:

Category ≠ Medicine

Category:

organizational layer.
Product Uses Category

Medicine inherits:

classification,
attributes,
filters.
Categories Drive UX

Examples:

sidebar navigation
inventory filters
report grouping
purchase planning
REAL PHARMACY FLOW SO FAR

We now have:

Create Category Structure
        ↓
Medicines
        ↓
Tablets
        ↓
Fever

# ATTRIBUTE SYSTEM

WHY ATTRIBUTES EXIST IN A PHARMACY

Not all pharmacy products are the same.

Example:

| Product Type | Required Data      |
| ------------ | ------------------ |
| Tablet       | Strength           |
| Syrup        | Flavor             |
| Injection    | Storage Temp       |
| Insulin      | Cold Storage       |
| Device       | Warranty           |
| Ayurvedic    | Herbal Composition |

REAL PHARMACY THINKING

A pharmacist thinks:

    "Dolo 650 is a tablet with 650mg strength"

NOT:

    "Dolo has generic JSON data"

Attributes help model:

    medicine-specific metadata.

EXAMPLE PRODUCT:

Dolo 650

to store metadata like:

| Attribute             | Value            |
| --------------------- | ---------------- |
| Strength              | 650mg            |
| Dosage Form           | Tablet           |
| Prescription Required | No               |
| Storage Condition     | Room Temperature |

ATTRIBUTE ARCHITECTURE

Backend Supports

Attribute Master
        ↓
Category Attribute Mapping
        ↓
Product Attribute Values

## Create Attribute Master

First:
define reusable medicine properties.

Example Attribute
Strength

POST /attributes

Business Meaning

Create reusable medicine metadata field.

Strength

Request

{
  "name": "Strength",
  "display_name": "Medicine dosage strength",
  "data_type": "text"
}

Response:

{
    "success": true,
    "data": {
        "attribute_uuid": "18e114ca-9e1f-4f21-8178-6e4f283e92c5",
        "name": "Strength",
        "display_name": "Medicine dosage strength",
        "data_type": "text",
        "created_at": "2026-05-25 14:38:12"
    }
}

WHY THIS EXISTS

Now:

ANY medicine can use:

Strength

| Medicine  | Strength |
| --------- | -------- |
| Dolo      | 650mg    |
| Azithral  | 500mg    |
| Amoxyclav | 625mg    |

Create More Pharmacy Attributes

Dosage

POST /attributes

Request:

{
  "name": "Dosage Form",
  "display_name": "Physical medicine form",
  "data_type": "select"
}

Response:

{
    "success": true,
    "data": {
        "attribute_uuid": "dbcbe483-3e1c-4dd9-9e84-194523df85d4",
        "name": "Dosage Form",
        "display_name": "Physical medicine form",
        "data_type": "select",
        "created_at": "2026-05-25 14:39:33"
    }
}

Storage Condition

POST /attributes

Request:

{
  "name": "Storage Condition",
  "display_name": "Medicine storage requirement",
  "data_type": "text"
}

Response:

{
    "success": true,
    "data": {
        "attribute_uuid": "5dcce386-5c8f-4e1a-8e96-21ce6f904606",
        "name": "Storage Condition",
        "display_name": "Medicine storage requirement",
        "data_type": "text",
        "created_at": "2026-05-25 14:44:36"
    }
}

Prescription Required

Request:

{
  "name": "Prescription Required",
  "display_name": "Whether doctor prescription is required",
  "data_type": "boolean"
}

Response:

{
    "success": true,
    "data": {
        "attribute_uuid": "5d9b0940-fb1d-4d7a-a3bd-024b2c42fade",
        "name": "Prescription Required",
        "display_name": "Whether doctor prescription is required",
        "data_type": "boolean",
        "created_at": "2026-05-25 14:45:41"
    }
}

ATTRIBUTE TYPES

| Type    | Usage                 |
| ------- | --------------------- |
| text    | 650mg                 |
| number  | dosage count          |
| boolean | prescription required |
| select  | tablet/syrup          |
| date    | license expiry        |

# Map Attributes To Category

Now:
we define which attributes belong to:

Tablets

WHY THIS EXISTS

Tablets need:

    strength
    dosage form

BUT:
    syrups may need:

        flavor
        bottle size

Different categories need different metadata.

WHY THIS EXISTS

Tablets need:

strength
dosage form

BUT:
syrups may need:

flavor
bottle size

Different categories need different metadata.

Strength

POST /category-attributes

{
  "category_uuid": "18e114ca-9e1f-4f21-8178-6e4f283e92c5",
  "attribute_uuid": "5dcce386-5c8f-4e1a-8e96-21ce6f904606",
  "is_required": true
}

Response:

{
    "success": true,
    "message": "Attribute assigned"
}

Dosage Form

POST /category-attributes

{
  "category_uuid": "715da1d6-13d5-4769-b2b1-0384a29b85cd",
  "attribute_uuid": "dbcbe483-3e1c-4dd9-9e84-194523df85d4",
  "is_required": true
}

Response:
{
    "success": true,
    "message": "Attribute assigned"
}

Storage Condition

POST /category-attributes

{
  "category_uuid": "715da1d6-13d5-4769-b2b1-0384a29b85cd",
  "attribute_uuid": "5dcce386-5c8f-4e1a-8e96-21ce6f904606",
  "is_required": true
}

Response:
{
    "success": true,
    "message": "Attribute assigned"
}

Get Category Attributes

GET /category-attributes/cat_tab_001

{
    "success": true,
    "data": [
        {
            "attribute_uuid": "18e114ca-9e1f-4f21-8178-6e4f283e92c5",
            "name": "Strength",
            "display_name": "Medicine dosage strength",
            "data_type": "text",
            "is_required": 1,
            "sort_order": 0
        },
        {
            "attribute_uuid": "dbcbe483-3e1c-4dd9-9e84-194523df85d4",
            "name": "Dosage Form",
            "display_name": "Physical medicine form",
            "data_type": "select",
            "is_required": 1,
            "sort_order": 0
        },
        {
            "attribute_uuid": "5dcce386-5c8f-4e1a-8e96-21ce6f904606",
            "name": "Storage Condition",
            "display_name": "Medicine storage requirement",
            "data_type": "text",
            "is_required": 1,
            "sort_order": 0
        },
        {
            "attribute_uuid": "18e114ca-9e1f-4f21-8178-6e4f283e92c5",
            "name": "Strength",
            "display_name": "Medicine dosage strength",
            "data_type": "text",
            "is_required": 1,
            "sort_order": 1
        }
    ]
}

# PRODUCT MASTER APIs

REAL PHARMACY THINKING

A pharmacy owner first defines:

What medicine is this?

ONLY AFTER THAT:
they purchase inventory.

OUR RUNNING EXAMPLE

We already created:

Medicines
   ↓
Tablets
   ↓
Fever

And attributes:

Strength
Dosage Form
Storage Condition
Prescription Required

Now we finally create:

Dolo 650 Tablet

WHAT A PRODUCT STORES

Your product table represents:

Permanent Medicine Metadata

NOT inventory.

Real Product Data

| Field         | Example           |
| ------------- | ----------------- |
| Name          | Dolo 650          |
| Composition   | Paracetamol 650mg |
| Manufacturer  | Micro Labs        |
| Schedule Type | NONE              |
| GST           | 12%               |
| HSN           | 3004              |
| Unit          | Strip             |
| Rack          | A-12              |
| Barcode       | 890123456         |
| Category      | Fever Tablets     |

IMPORTANT

At this stage:

NO stock exists yet.

Inventory comes later via:

purchases,
batches.

PRODUCT CREATION WORKFLOW

## Create Product Master

Business Meaning

Create medicine definition inside pharmacy system.

This allows:

searching,
billing,
purchasing,
inventory linking,
compliance management.

POST /products

Request:

{
  "name": "Dolo 650",
  "composition": "Paracetamol 650mg",
  "manufacturer": "Micro Labs",
  "category_uuid": "897309e6-ffd1-4c94-9917-cab3a645f522",

  "medicine_type": "Tablet",
  "unit": "Strip",

  "price": 0,

  "schedule_type": "NONE",

  "gst_percent": 12,
  "hsn_code": "3004",

  "rack_location": "A-12",

  "barcode": "8901234567890",
  "sku": "DOLO650TAB",

  "attributes": [
    {
      "attribute_uuid": "18e114ca-9e1f-4f21-8178-6e4f283e92c5",
      "value": "650mg"
    },
    {
      "attribute_uuid": "dbcbe483-3e1c-4dd9-9e84-194523df85d4",
      "value": "Tablet"
    },
    {
      "attribute_uuid": "5dcce386-5c8f-4e1a-8e96-21ce6f904606",
      "value": "Room Temperature"
    }
  ]
}

Response:

{
    "success": true,
    "data": {
        "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
        "name": "Dolo 650",
        "category_uuid": "897309e6-ffd1-4c94-9917-cab3a645f522",
        "subcategory": null,
        "barcode": "8901234567890",
        "sku": "DOLO650TAB",
        "product_type": "medicine",
        "manufacturer": "Micro Labs",
        "composition": "Paracetamol 650mg",
        "schedule_type": "NONE",
        "prescription_required": 0,
        "medicine_type": "Tablet",
        "rack_location": "A-12",
        "unit": "Strip",
        "price": 0,
        "purchase_price": 0,
        "gst_percent": 12,
        "stock": 0,
        "hsn_code": "3004",
        "image": null,
        "created_at": "2026-05-26 09:53:44",
        "updated_at": "2026-05-26 09:53:44",
        "attributes": [
            {
                "attribute_uuid": "18e114ca-9e1f-4f21-8178-6e4f283e92c5",
                "name": "Strength",
                "value": "650mg"
            },
            {
                "attribute_uuid": "dbcbe483-3e1c-4dd9-9e84-194523df85d4",
                "name": "Dosage Form",
                "value": "Tablet"
            },
            {
                "attribute_uuid": "5dcce386-5c8f-4e1a-8e96-21ce6f904606",
                "name": "Storage Condition",
                "value": "Room Temperature"
            }
        ]
    }
}

## List Products

GET /products

## Get Product Details

GET /products/:uuid

## Search Products

GET /products/search?q=

By Brand

GET /products/search?q=dolo

By Composition

GET /products/search?q=paracetamol

By Barcode

GET /products/search?q=8901234567890

By Rack

GET /products/search?q=A-12

Low Stock Products

GET /products/low-stock

GET /products/low-stock?threshold=10

# PRODUCT UNIT APIs


REAL PHARMACY THINKING

A pharmacist thinks:

    "I purchased 10 boxes,
    each box has 20 strips,
    each strip has 15 tablets."

NOT:

    "I have quantity = 3000"

That distinction is VERY important.

A medicine is NOT always sold in one form.

| Unit   | Meaning      |
| ------ | ------------ |
| Tablet | Single piece |
| Strip  | 15 tablets   |
| Box    | 20 strips    |

### Create Base Unit

Usually:

smallest sellable unit.

POST /product-units

{
  "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
  "unit_name": "Tablet",
  "conversion_factor": 1,
  "is_base_unit": true
}

{
    "success": true,
    "data": {
        "unit_uuid": "4fdc044c-7ed3-428d-8773-d8df64932919",
        "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
        "unit_name": "Tablet",
        "conversion_factor": 1,
        "barcode": null,
        "price": null,
        "purchase_price": null,
        "is_base_unit": 1,
        "created_at": "2026-05-26 10:11:15"
    }
}

### Create Strip Unit

Now define:

1 Strip = 15 Tablets

POST /product-units

{
  "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
  "unit_name": "Strip",
  "conversion_factor": 15,
  "barcode": "STRIP890123",
  "is_base_unit": false
}

{
    "success": true,
    "data": {
        "unit_uuid": "353969d9-a8e3-4cd3-876a-16248a1f5c29",
        "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
        "unit_name": "Strip",
        "conversion_factor": 15,
        "barcode": "STRIP890123",
        "price": null,
        "purchase_price": null,
        "is_base_unit": 0,
        "created_at": "2026-05-26 10:15:16"
    }
}

Business Meaning

Selling:

    1 strip

means:

    15 tablets

inside inventory calculations.

### Create Box Unit

Now define:

1 Box = 20 Strips

{
  "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
  "unit_name": "Box",
  "conversion_factor": 300,
  "barcode": "BOX890123",
  "is_base_unit": false
}

{
    "success": true,
    "data": {
        "unit_uuid": "585041e5-d133-47e2-ad9e-cb43c0e90124",
        "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
        "unit_name": "Box",
        "conversion_factor": 300,
        "barcode": "BOX890123",
        "price": null,
        "purchase_price": null,
        "is_base_unit": 0,
        "created_at": "2026-05-26 10:19:57"
    }
}

List Product Units

GET /product-units/product/product_uuid

{
    "success": true,
    "data": [
        {
            "unit_uuid": "4fdc044c-7ed3-428d-8773-d8df64932919",
            "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
            "unit_name": "Tablet",
            "conversion_factor": 1,
            "barcode": null,
            "price": null,
            "purchase_price": null,
            "is_base_unit": 1,
            "created_at": "2026-05-26 10:11:15"
        },
        {
            "unit_uuid": "353969d9-a8e3-4cd3-876a-16248a1f5c29",
            "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
            "unit_name": "Strip",
            "conversion_factor": 15,
            "barcode": "STRIP890123",
            "price": null,
            "purchase_price": null,
            "is_base_unit": 0,
            "created_at": "2026-05-26 10:15:16"
        },
        {
            "unit_uuid": "585041e5-d133-47e2-ad9e-cb43c0e90124",
            "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
            "unit_name": "Box",
            "conversion_factor": 300,
            "barcode": "BOX890123",
            "price": null,
            "purchase_price": null,
            "is_base_unit": 0,
            "created_at": "2026-05-26 10:19:57"
        }
    ]
}

### List Product Units

GET /product-units/product/product_uuid

<!-- HOW THIS CONNECTS TO INVENTORY

This becomes VERY important later during:

batch inventory.

Example:

Purchase Entry
5 Boxes

Backend converts:

5 × 300 = 1500 tablets

stored in inventory.

Sale Entry
2 Strips

Backend converts:

2 × 15 = 30 tablets

deducted from stock. -->

Purchases & Sales Can Use Different Units

Example:

| Operation | Unit   |
| --------- | ------ |
| Purchase  | Box    |
| Sale      | Strip  |
| Return    | Tablet |

Create Categories
        ↓
Create Attributes
        ↓
Map Attributes
        ↓
Create Product Master
        ↓
Define Product Units

# BATCH INVENTORY APIs

Product ≠ Stock

A product is:

medicine identity

BUT:

Batch is the actual physical stock.
THE MOST IMPORTANT PHARMACY CONCEPT

A pharmacy NEVER stores stock like:

Dolo 650 = 500 qty

Instead they store:

| Batch | Expiry   | Qty |
| ----- | -------- | --- |
| DL001 | Dec 2026 | 100 |
| DL002 | Mar 2027 | 250 |
| DL003 | Jul 2027 | 150 |

Because:

each shipment differs,
expiry differs,
supplier differs,
pricing differs,
legal traceability differs.

THAT is why batches exist.

And your backend models this VERY correctly.

REAL PHARMACY THINKING

Pharmacist thinks:

"I have Dolo 650 from Batch DL001,
expiring in Dec 2026,
with 100 strips available."

NOT:

"I have stock = 100"

This distinction is EVERYTHING.

WHAT A BATCH STORES

A batch represents:

| Field            | Meaning    |
| ---------------- | ---------- |
| Product          | Dolo 650   |
| Batch Number     | DL001      |
| Expiry           | Dec 2026   |
| MFG Date         | Jan 2025   |
| Quantity         | 100        |
| MRP              | ₹34        |
| PTR              | ₹24        |
| Supplier         | ABC Pharma |
| Purchase Invoice | PUR-001    |

BATCH INVENTORY FLOW

Purchase
    ↓
Batch Creation
    ↓
Stock Ledger
    ↓
Product Stock Recalculation

### Create Batch

POST /product-batches

{
  "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",

  "batch_number": "DOLO-001",

  "expiry_date": "2026-12-31",

  "manufacture_date": "2025-01-01",

  "mrp": 34,

  "ptr": 24,

  "rate": 22,

  "purchase_price": 22,

  "selling_price": 34,

  "gst_percent": 12,

  "quantity": 100,

  "supplier_uuid": "747bb3b7-d8d0-4b1a-abdf-4a705a9218b1"
}

{
    "success": true,
    "data": {
        "batch_uuid": "2be36083-f5c9-4d74-8452-0a8c337a41ce",
        "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",
        "batch_number": "DOLO-001",
        "expiry_date": "2026-12-31",
        "manufacture_date": "2025-01-01",
        "mrp": 34,
        "ptr": 24,
        "rate": 22,
        "purchase_price": 22,
        "selling_price": 34,
        "gst_percent": 12,
        "quantity": 100,
        "sold_quantity": 0,
        "free_quantity": 0,
        "is_quarantined": 0,
        "supplier_uuid": "747bb3b7-d8d0-4b1a-abdf-4a705a9218b1",
        "purchase_uuid": null,
        "created_at": "2026-05-26 10:57:14",
        "updated_at": "2026-05-26 10:57:14"
    }
}

Get All Batches

GET /product-batches

Business Meaning

Inventory management screen.

Used by:

    pharmacists,
    inventory staff,
    expiry managers.

Get Product Batches

GET /product-batches/product/:product_uuid

GET /product-batches/product/prod_dolo_650

Get Batch Details

GET /product-batches/:uuid

Delete Batch

DELETE /product-batches/:uuid

Expiring Medicines

GET /product-batches/expiring

GET /product-batches/expiring?days=30

Expired Medicines

GET /product-batches/expired

Quarantine Batch

POST /product-batches/:uuid/quarantine



PURCHASE INVENTORY APIs
Create Purchase Entry

POST /purchases

{
  "supplier_uuid": "747bb3b7-d8d0-4b1a-abdf-4a705a9218b1",

  "invoice_number": "INV-7845",

  "invoice_date": "2026-01-10",

  "payment_status": "PENDING",

  "items": [
    {
      "product_uuid": "a9a649fa-a353-494d-81e2-a81d7a1409f2",

      "batch_number": "DL001",

      "manufacture_date": "2025-01-01",
      "expiry_date": "2026-12-31",

      "quantity": 10,

      "unit_uuid": "unit_box",
      
      "cost_price": 220,
      
      "purchase_price": 220,

      "ptr": 240,
      
      "mrp": 340,

      "gst_percent": 12
    }
  ]
}


POST: /carts


Body: none

Respones:

{
    "success": true,
    "message": "Cart created successfully",
    "data": {
        "cart_uuid": "2601767e-c4eb-455b-af42-bb62042f93e2",
        "status": "active",
        "discount": 0,
        "created_at": "2026-05-26 14:19:12",
        "updated_at": "2026-05-26 14:19:12"
    }
}

POST /carts/:cart_uuid/items

Body:

{
  "product_uuid": "9e3a87b1-4fdd-4c14-a58d-643941d34841",
  "quantity": 2
}

GET: /carts/:cart_uuid

{
    "success": true,
    "data": {
        "cart_uuid": "2601767e-c4eb-455b-af42-bb62042f93e2",
        "status": "active",
        "discount": 0,
        "created_at": "2026-05-26 14:19:12",
        "updated_at": "2026-05-26 14:19:12",
        "items": [
            {
                "id": 2,
                "cart_uuid": "2601767e-c4eb-455b-af42-bb62042f93e2",
                "product_uuid": "9e3a87b1-4fdd-4c14-a58d-643941d34841",
                "quantity": 2,
                "price": 20,
                "discount": 0,
                "tax_percent": 0,
                "created_at": "2026-05-26 14:22:00",
                "updated_at": "2026-05-26 14:22:00",
                "product": {
                    "product_uuid": "9e3a87b1-4fdd-4c14-a58d-643941d34841",
                    "name": "new product",
                    "manufacturer": "new  amnufaturer",
                    "gst_percent": 0,
                    "purchase_price": 10,
                    "price": 20,
                    "stock": 9,
                    "unit": "strip",
                    "schedule_type": "NONE",
                    "prescription_required": 0,
                    "created_at": "2026-05-26 12:37:56",
                    "updated_at": "2026-05-26 12:57:58"
                },
                "gst_amount": 0,
                "total": 40
            }
        ],
        "summary": {
            "total": 40,
            "item_discount": 0,
            "bill_discount": 0,
            "tax": 0,
            "grand_total": 40
        }
    }
}

Checkout

POST: /carts/:cart_uuid/checkout

{
  "customer_uuid": "7a39d304-bdcd-4f0d-b5ed-e56d8063c733",

  "payments": [
    {
      "method": "cash",
      "amount": 40
    }
  ]
}
