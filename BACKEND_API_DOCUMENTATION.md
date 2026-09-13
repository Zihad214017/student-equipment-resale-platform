# Smart Student Old Equipment Tracking and Resale Platform
## Comprehensive Backend REST API Specification & Developer Guide

**Base URL**: `http://localhost:5000/api/v1` (Root Aliases supported: `http://localhost:5000/api/...`)  
**Format**: `application/json` (Multipart support for file uploads: `multipart/form-data`)  
**Security**: JWT Bearer Tokens, Bcrypt hashing, Helmet HTTP Security Headers, CORS, Express Rate Limiting, SQL Injection Prevention.

---

## 1. Authentication & RBAC System (`/api/v1/auth`)

### 1.1 Register User
* **Endpoint**: `POST /api/v1/auth/register` (Alias: `POST /api/auth/register`)
* **Auth**: Public
* **Required Role**: None
* **Request Body**:
```json
{
  "student_id": "STU-2024-001",
  "full_name": "Sarah Jenkins",
  "email": "sarah.jenkins@university.edu",
  "password": "Password123!",
  "phone": "+1 (555) 123-4567",
  "department": "Computer Science & Engineering"
}
```
* **Success Response** (`201 Created`):
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": "c0000000-0000-0000-0000-000000000001",
      "student_id": "STU-2024-001",
      "full_name": "Sarah Jenkins",
      "email": "sarah.jenkins@university.edu",
      "role": "student",
      "phone": "+1 (555) 123-4567",
      "department": "Computer Science & Engineering",
      "avatar_url": null,
      "is_active": true,
      "created_at": "2026-09-04T02:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
* **Error Responses**:
  * `400 Bad Request`: Validation failure (weak password, invalid university email, missing fields).
  * `409 Conflict`: User with email or student ID already exists.

---

### 1.2 User Login
* **Endpoint**: `POST /api/v1/auth/login` (Alias: `POST /api/auth/login`)
* **Auth**: Public
* **Required Role**: None
* **Request Body**:
```json
{
  "email": "sarah.jenkins@university.edu",
  "password": "Password123!"
}
```
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "message": "User logged in successfully.",
  "data": {
    "user": {
      "id": "c0000000-0000-0000-0000-000000000001",
      "student_id": "STU-2024-001",
      "full_name": "Sarah Jenkins",
      "email": "sarah.jenkins@university.edu",
      "role": "student",
      "department": "Computer Science & Engineering",
      "is_active": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
* **Error Responses**:
  * `401 Unauthorized`: Invalid email or incorrect password.
  * `403 Forbidden`: Account is deactivated by administrator.

---

### 1.3 Get Current User Profile
* **Endpoint**: `GET /api/v1/auth/me` (Alias: `GET /api/auth/me`)
* **Auth**: Bearer Token
* **Required Role**: Any Authenticated User (`student`, `admin`)
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "c0000000-0000-0000-0000-000000000001",
    "student_id": "STU-2024-001",
    "full_name": "Sarah Jenkins",
    "email": "sarah.jenkins@university.edu",
    "role": "student",
    "phone": "+1 (555) 123-4567",
    "department": "Computer Science & Engineering",
    "avatar_url": null,
    "seller_stats": {
      "average_rating": 4.8,
      "total_reviews": 12
    },
    "activity_stats": {
      "total_listings": 3,
      "active_listings": 2,
      "sent_requests": 5,
      "received_requests": 1,
      "total_transactions": 4
    }
  }
}
```

---

## 2. Profile Management (`/api/v1/users`)

### 2.1 Update Own Profile
* **Endpoint**: `PUT /api/v1/users/profile` (Alias: `PUT /api/users/profile`)
* **Auth**: Bearer Token
* **Required Role**: Authenticated Owner
* **Request Body**:
```json
{
  "full_name": "Sarah Jenkins, B.Sc.",
  "phone": "+1 (555) 987-6543",
  "department": "Software Engineering",
  "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
}
```
* **Success Response** (`200 OK`): Returns updated user profile.

---

### 2.2 Change Password
* **Endpoint**: `PUT /api/v1/users/change-password` (Alias: `PUT /api/auth/change-password`)
* **Auth**: Bearer Token
* **Required Role**: Authenticated Owner
* **Request Body**:
```json
{
  "current_password": "Password123!",
  "new_password": "NewStrongPassword456!"
}
```
* **Success Response** (`200 OK`): `{ "success": true, "message": "Password changed successfully." }`
* **Error Responses**:
  * `400 Bad Request`: Current password incorrect or new password identical to old password.

---

### 2.3 View Public Seller Information
* **Endpoint**: `GET /api/v1/users/sellers/:id` (Alias: `GET /api/users/:id`)
* **Auth**: Public
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "b0000000-0000-0000-0000-000000000001",
    "full_name": "Alex Rivera",
    "department": "Computer Science & Engineering",
    "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
    "seller_stats": {
      "average_rating": 4.67,
      "total_reviews": 3,
      "breakdown": { "5": 2, "4": 1, "3": 0, "2": 0, "1": 0 }
    },
    "active_listings": [ ... ],
    "recent_reviews": [ ... ]
  }
}
```

---

## 3. Categories Management (`/api/v1/categories`)

### 3.1 List All Categories
* **Endpoint**: `GET /api/v1/categories` (Alias: `GET /api/categories`)
* **Auth**: Public
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "10000000-0000-0000-0000-000000000001",
      "name": "Electronics & Gadgets",
      "slug": "electronics",
      "description": "Laptops, tablets, calculators, microcontrollers, and electronic components.",
      "icon": "laptop",
      "equipment_count": 5
    }
  ]
}
```

---

### 3.2 Admin: Create Category
* **Endpoint**: `POST /api/v1/admin/categories` (or `POST /api/v1/categories` with admin role)
* **Auth**: Bearer Token
* **Required Role**: `admin`
* **Request Body**:
```json
{
  "name": "Robotics & Automation",
  "description": "Robotics kits, servo motors, sensors, and chassis.",
  "icon": "bot"
}
```
* **Success Response** (`201 Created`): Returns created category record.

---

## 4. Equipment Listings & Multi-Filter Search (`/api/v1/equipment`)

### 4.1 Marketplace Catalog (Multi-Filter, Search, Sorting, & Pagination)
* **Endpoint**: `GET /api/v1/equipment` (Alias: `GET /api/equipment`)
* **Auth**: Public
* **Query Parameters**:
  * `keyword` (string): Search in `title`, `description`, `brand`.
  * `category` (string): Category ID or slug or name.
  * `condition` (string): `New`, `Like New`, `Good`, `Fair`, `Used` (case-insensitive).
  * `minPrice` (number): Minimum price filter.
  * `maxPrice` (number): Maximum price filter.
  * `sortBy` (string): `price_asc`, `price_desc`, `newest`, `oldest`, `popular`, `title_asc`.
  * `page` (integer, default `1`): Page number.
  * `limit` (integer, default `12`, max `50`): Items per page.
* **Example**: `GET /api/v1/equipment?keyword=oscilloscope&condition=Good&minPrice=100&maxPrice=500&sortBy=price_asc&page=1&limit=10`
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "20000000-0000-0000-0000-000000000001",
      "title": "Rigol DS1054Z Digital Oscilloscope (50MHz 4CH)",
      "description": "Excellent digital oscilloscope with 4 channels, active probes, and power cable.",
      "condition": "good",
      "price": 270.00,
      "original_price": 399.00,
      "brand": "Rigol",
      "status": "available",
      "seller": {
        "id": "b0000000-0000-0000-0000-000000000001",
        "full_name": "Alex Rivera",
        "department": "Computer Science & Engineering",
        "seller_rating": 4.67
      },
      "category": {
        "id": "10000000-0000-0000-0000-000000000001",
        "name": "Electronics & Gadgets",
        "slug": "electronics"
      },
      "images": [
        {
          "id": "...",
          "image_url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
          "is_primary": true
        }
      ]
    }
  ],
  "meta": {
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1,
    "pageSize": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 4.2 Create Equipment Listing
* **Endpoint**: `POST /api/v1/equipment` (Alias: `POST /api/equipment`)
* **Auth**: Bearer Token
* **Required Role**: `student` or `admin`
* **Content-Type**: `multipart/form-data` or `application/json`
* **Request Body**:
```json
{
  "title": "Prusa i3 MK3S+ 3D Printer",
  "description": "Assembled 3D printer with textured PEI sheet and extra brass nozzles.",
  "category_id": "10000000-0000-0000-0000-000000000001",
  "condition": "Like New",
  "price": 550.00,
  "original_price": 799.00,
  "brand": "Prusa Research",
  "is_negotiable": true
}
```
* **Success Response** (`201 Created`): Returns created equipment record.

---

### 4.3 Update Equipment Listing
* **Endpoint**: `PUT /api/v1/equipment/:id`
* **Auth**: Bearer Token
* **Required Role**: Seller (Listing Owner) or Admin
* **Success Response** (`200 OK`): Returns updated equipment listing.

---

### 4.4 Update Listing Availability Status
* **Endpoint**: `PATCH /api/v1/equipment/:id/status`
* **Auth**: Bearer Token
* **Required Role**: Listing Owner or Admin
* **Request Body**: `{ "status": "reserved" }` (Statuses: `available`, `reserved`, `sold`, `archived`)
* **Success Response** (`200 OK`): Returns updated status.

---

### 4.5 Delete Equipment Listing
* **Endpoint**: `DELETE /api/v1/equipment/:id`
* **Auth**: Bearer Token
* **Required Role**: Listing Owner or Admin
* **Success Response** (`200 OK`): Deletes (or archives if active transaction records exist).

---

## 5. Purchase Request Management (`/api/v1/purchase-requests`)

### 5.1 Submit Purchase Request
* **Endpoint**: `POST /api/v1/purchase-requests` (Alias: `POST /api/purchase-requests`)
* **Auth**: Bearer Token
* **Required Role**: Buyer (`student`)
* **Request Body**:
```json
{
  "equipment_id": "20000000-0000-0000-0000-000000000001",
  "proposed_price": 250.00,
  "message": "Can meet tomorrow at the campus library."
}
```
* **Success Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Purchase request submitted successfully.",
  "data": {
    "id": "30000000-0000-0000-0000-000000000001",
    "equipment_id": "20000000-0000-0000-0000-000000000001",
    "buyer_id": "c0000000-0000-0000-0000-000000000001",
    "seller_id": "b0000000-0000-0000-0000-000000000001",
    "proposed_price": 250.00,
    "status": "pending",
    "message": "Can meet tomorrow at the campus library."
  }
}
```
* **Integrity Guardrails**:
  * Cannot purchase own listing (`400 Bad Request`).
  * Only `available` listings can receive offers (`400 Bad Request`).
  * Duplicate active pending requests from same buyer are prevented (`409 Conflict`).

---

### 5.2 Seller: Respond to Purchase Request (Accept / Reject)
* **Endpoint**: `PATCH /api/v1/purchase-requests/:id/respond`
* **Auth**: Bearer Token
* **Required Role**: Seller of Listing
* **Request Body**:
```json
{
  "status": "accepted",
  "response_note": "Agreed. See you at the library at 3 PM."
}
```
* **Success Response** (`200 OK`):
  * Sets request status to `accepted`.
  * Automatically transitions equipment listing status to `reserved`.
  * Automatically creates a `transactions` record with status `accepted`.
  * Automatically closes (`rejected`) all other competing pending requests for that equipment with notification notices sent to those buyers.

---

### 5.3 Buyer: Cancel Purchase Request
* **Endpoint**: `PATCH /api/v1/purchase-requests/:id/cancel`
* **Auth**: Bearer Token
* **Required Role**: Request Owner (Buyer)
* **Success Response** (`200 OK`): Sets request status to `cancelled`.

---

## 6. Transaction Tracking & Lifecycle Subsystem (`/api/v1/transactions`)

### 6.1 View Buyer Purchase History
* **Endpoint**: `GET /api/v1/transactions/buyer` (Alias: `GET /api/transactions/my-purchases`)
* **Auth**: Bearer Token
* **Required Role**: Buyer
* **Success Response** (`200 OK`): Returns buyer's transactions with equipment details, seller info, meeting notes, and review eligibility.

---

### 6.2 View Seller Sales History
* **Endpoint**: `GET /api/v1/transactions/seller` (Alias: `GET /api/transactions/my-sales`)
* **Auth**: Bearer Token
* **Required Role**: Seller
* **Success Response** (`200 OK`): Returns seller's transactions with equipment info and buyer profiles.

---

### 6.3 Update Transaction Status
* **Endpoint**: `PATCH /api/v1/transactions/:id/status`
* **Auth**: Bearer Token
* **Required Role**: Buyer, Seller, or Admin (Role-Gated State Machine)
* **Request Body**:
```json
{
  "status": "sold",
  "meeting_location": "Student Union Building, Room 204",
  "notes": "Payment received in cash."
}
```
* **State Machine Rules**:
  * `pending` $\rightarrow$ `accepted`, `rejected`
  * `accepted` $\rightarrow$ `sold` (**Seller/Admin only**; synchronizes equipment status to `sold`).
  * `sold` $\rightarrow$ `completed` (**Buyer/Admin only**; confirms physical delivery and unlocks rating).
  * `rejected` $\rightarrow$ Aborts transaction and automatically resets equipment status back to `available`.

---

## 7. Notification Subsystem (`/api/v1/notifications`)

### 7.1 Get User Notifications
* **Endpoint**: `GET /api/v1/notifications` (Alias: `GET /api/notifications`)
* **Auth**: Bearer Token
* **Query Parameters**: `is_read=false|true|all`, `page=1`, `limit=15`.
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Purchase Request Accepted!",
      "message": "Great news! Alex Rivera accepted your request for '3D Printer'. The item is now reserved for you.",
      "type": "request_status",
      "is_read": false,
      "reference_id": "...",
      "created_at": "2026-09-04T02:00:00.000Z"
    }
  ],
  "meta": {
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1,
    "unread_count": 1
  }
}
```

---

### 7.2 Get Unread Count
* **Endpoint**: `GET /api/v1/notifications/unread-count`
* **Auth**: Bearer Token
* **Success Response** (`200 OK`): `{ "success": true, "data": { "unread_count": 1 } }`

---

### 7.3 Mark Single Notification as Read
* **Endpoint**: `PATCH /api/v1/notifications/:id/read`
* **Auth**: Bearer Token
* **Success Response** (`200 OK`): Returns updated notification with `is_read: true`.

---

### 7.4 Mark All Notifications as Read
* **Endpoint**: `PATCH /api/v1/notifications/read-all`
* **Auth**: Bearer Token
* **Success Response** (`200 OK`): `{ "success": true, "message": "2 notification(s) marked as read.", "data": { "updated_count": 2 } }`

---

## 8. Review & Rating Subsystem (`/api/v1/reviews`)

### 8.1 Submit Review for Completed Transaction
* **Endpoint**: `POST /api/v1/reviews` (Alias: `POST /api/reviews`)
* **Auth**: Bearer Token
* **Required Role**: Buyer of Completed Transaction
* **Request Body**:
```json
{
  "transaction_id": "32ceb432-7059-490e-9585-beca751c3cc1",
  "rating": 5,
  "comment": "Excellent seller! The equipment was in pristine condition."
}
```
* **Success Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Review submitted successfully.",
  "data": {
    "id": "...",
    "transaction_id": "32ceb432-7059-490e-9585-beca751c3cc1",
    "rating": 5,
    "comment": "Excellent seller! The equipment was in pristine condition.",
    "reviewer_name": "Sarah Jenkins",
    "seller_name": "Alex Rivera"
  }
}
```
* **Rules**:
  * Only allowed if `transaction.status === 'completed'` (`400 Bad Request` if incomplete).
  * Only buyer can submit review (`403 Forbidden` for non-buyer).
  * Duplicate reviews on same transaction blocked (`409 Conflict`).
  * Rating must be integer between 1 and 5 (`400 Bad Request` if invalid).

---

### 8.2 Get Seller Reviews & Rating Summary
* **Endpoint**: `GET /api/v1/reviews/seller/:sellerId`
* **Auth**: Public
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "totalItems": 3,
    "rating_summary": {
      "seller_id": "b0000000-0000-0000-0000-000000000001",
      "seller_name": "Alex Rivera",
      "average_rating": 4.67,
      "total_reviews": 3,
      "distribution": { "5": 2, "4": 1, "3": 0, "2": 0, "1": 0 }
    }
  }
}
```

---

## 9. Admin Management & Platform Analytics (`/api/v1/admin`)

*All Admin routes strictly require `Authorization: Bearer <ADMIN_JWT>` and `role: "admin"`.*

### 9.1 Platform Analytics & Statistics Dashboard
* **Endpoint**: `GET /api/v1/admin/reports` (Alias: `GET /api/v1/admin/dashboard`, `GET /api/admin/reports`)
* **Auth**: Bearer Token
* **Required Role**: `admin`
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Platform statistics and reports retrieved successfully.",
  "data": {
    "users": {
      "total_users": 6,
      "total_admins": 1,
      "total_students": 5,
      "total_active_users": 6,
      "total_deactivated_users": 0,
      "total_buyers": 3,
      "total_sellers": 2
    },
    "equipment": {
      "total_equipment": 8,
      "available_equipment": 5,
      "reserved_equipment": 1,
      "sold_equipment": 2,
      "archived_equipment": 0,
      "pending_approval_equipment": 0,
      "approved_equipment": 8
    },
    "purchase_requests": {
      "total_purchase_requests": 6,
      "pending_requests": 1,
      "accepted_requests": 3,
      "rejected_requests": 1,
      "cancelled_requests": 1
    },
    "transactions": {
      "total_transactions": 3,
      "completed_transactions": 2,
      "sold_transactions": 0,
      "accepted_transactions": 1,
      "pending_transactions": 0,
      "rejected_transactions": 0,
      "total_volume_amount": 1050.00
    },
    "reviews": {
      "total_reviews": 2,
      "platform_average_rating": 4.67
    },
    "category_breakdown": [
      { "id": "...", "name": "Electronics & Gadgets", "slug": "electronics", "equipment_count": 4 }
    ],
    "recent_activity": {
      "transactions": [ ... ],
      "registrations": [ ... ]
    }
  }
}
```

---

### 9.2 Admin User Management
* `GET /api/v1/admin/users`: Paginated user list with `?search=keyword`, `?role=student|admin`, `?is_active=true|false`.
* `GET /api/v1/admin/users/:id`: Single user details with activity counts and audit trail.
* `PATCH /api/v1/admin/users/:id/toggle-status`: Toggle active/deactivated (`{ "is_active": false }`).
* `PUT /api/v1/admin/users/:id`: Administrative user profile modification.

---

### 9.3 Admin Equipment Moderation
* `GET /api/v1/admin/equipment`: View all listings across all approval states.
* `PATCH /api/v1/admin/equipment/:id/approval`: Approve or reject listing (`{ "status": "approved", "reason": "Verified" }`).
* `DELETE /api/v1/admin/equipment/:id`: Remove inappropriate listing.

---

---

## 10. Payment Gateway Subsystem (`/api/v1/payments`)

### 10.1 Initiate Payment
* **Endpoint**: `POST /api/v1/payments/initiate`
* **Auth**: Bearer Token (`student`)
* **Required Role**: Buyer of the transaction
* **Request Body**:
```json
{
  "transaction_id": "36e36451-56a9-41e8-817f-71c0aee985a1",
  "payment_method": "BKASH",
  "customer_phone": "01700000000",
  "callback_url": "https://campus-market.edu/payment/callback"
}
```
* **Success Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Payment initiated successfully.",
  "data": {
    "payment_id": "c9876f89-ee92-4211-905d-2f6777e7178a",
    "transaction_id": "36e36451-56a9-41e8-817f-71c0aee985a1",
    "payment_method": "BKASH",
    "payment_status": "INITIATED",
    "amount": 165.00,
    "provider_reference": "BKASH_PAY_c9876f89_1789185960257",
    "redirect_url": "/payment/bkash/checkout?paymentID=...",
    "payment_url": "https://sandbox.bka.sh/checkout?paymentID=..."
  }
}
```
* **Error Responses**:
  * `400 Bad Request`: Validation failure or invalid transaction state (not accepted).
  * `403 Forbidden`: User is not the buyer of this transaction.
  * `404 Not Found`: Transaction does not exist.
  * `409 Conflict`: Transaction has already been successfully paid.

---

### 10.2 Verify / Execute Payment
* **Endpoint**: `POST /api/v1/payments/:id/verify`
* **Auth**: Bearer Token (`student`)
* **Required Role**: Buyer of the transaction
* **Request Body**:
```json
{
  "provider_transaction_id": "BKASH_TRX_955327",
  "provider_reference": "BKASH_PAY_c9876f89_1789185960257"
}
```
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Payment verified and completed successfully.",
  "data": {
    "payment_id": "c9876f89-ee92-4211-905d-2f6777e7178a",
    "transaction_id": "36e36451-56a9-41e8-817f-71c0aee985a1",
    "payment_method": "BKASH",
    "payment_status": "SUCCESS",
    "amount": 165.00,
    "provider_transaction_id": "BKASH_TRX_955327",
    "provider_reference": "BKASH_PAY_c9876f89_1789185960257",
    "paid_at": "2026-09-12T04:06:00.416Z"
  }
}
```
* **Idempotency**: Repeated verification calls return `200 OK` with existing `SUCCESS` state.
* **Side-Effects**: Updates transaction status to `sold` and equipment status to `sold`. Sends instant notifications to buyer and seller.

---

### 10.3 Buyer Payment History
* **Endpoint**: `GET /api/v1/payments/my-payments`
* **Auth**: Bearer Token (`student`)
* **Required Role**: Authenticated Buyer
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "c9876f89-ee92-4211-905d-2f6777e7178a",
      "transaction_id": "36e36451-56a9-41e8-817f-71c0aee985a1",
      "equipment_title": "Digital Oscilloscope 100MHz",
      "seller_name": "Alex Rivera",
      "amount": 165.00,
      "payment_method": "BKASH",
      "payment_status": "SUCCESS",
      "provider_transaction_id": "BKASH_TRX_955327",
      "paid_at": "2026-09-12T04:06:00.416Z"
    }
  ]
}
```

---

### 10.4 Get Payment by Transaction ID
* **Endpoint**: `GET /api/v1/payments/transaction/:transactionId`
* **Auth**: Bearer Token
* **Required Role**: Buyer or Seller of the transaction, or Admin
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "c9876f89-ee92-4211-905d-2f6777e7178a",
    "transaction_id": "36e36451-56a9-41e8-817f-71c0aee985a1",
    "amount": 165.00,
    "payment_method": "BKASH",
    "payment_status": "SUCCESS",
    "provider_transaction_id": "BKASH_TRX_955327",
    "paid_at": "2026-09-12T04:06:00.416Z"
  }
}
```

---

### 10.5 Admin Payment Monitoring
* **Endpoint**: `GET /api/v1/payments/admin`
* **Auth**: Bearer Token
* **Required Role**: `admin`
* **Query Parameters**: `?search=trxId`, `?status=SUCCESS|FAILED`, `?method=BKASH|NAGAD`, `?page=1`, `?limit=20`
* **Success Response** (`200 OK`): Paginated payments list with full buyer, seller, and equipment relational metadata.

---

### 10.6 Admin Payment Analytics & Revenue Stats
* **Endpoint**: `GET /api/v1/payments/admin/stats`
* **Auth**: Bearer Token
* **Required Role**: `admin`
* **Success Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "total_payments": 24,
    "successful_payments": 22,
    "failed_payments": 1,
    "pending_payments": 1,
    "total_volume": 14250.00,
    "bkash_volume": 9400.00,
    "nagad_volume": 4850.00,
    "bkash_count": 15,
    "nagad_count": 9
  }
}
```

---

### 10.7 Provider Webhook Callback Endpoint
* **Endpoint**: `ALL /api/v1/payments/callback/:provider` (`bkash` or `nagad`)
* **Auth**: Public / Gateway Webhook
* **Success Response** (`200 OK`): Confirms receipt of webhook event.

---

## 11. Standardized Error Response Envelope

All API errors conform to the standard error structure:

```json
{
  "success": false,
  "message": "Human-readable error explanation.",
  "errors": [
    {
      "field": "price",
      "message": "Price must be positive"
    }
  ]
}
```

| HTTP Status | Meaning | Scenario |
| :--- | :--- | :--- |
| `400 Bad Request` | Client validation failure | Invalid input, invalid status transitions, self-purchase attempt, premature review before delivery. |
| `401 Unauthorized`| Missing or invalid authentication | Missing `Authorization` Bearer token or invalid/expired JWT. |
| `403 Forbidden`   | RBAC / Permission violation | Student accessing admin route, student editing another user's review/equipment/payment. |
| `404 Not Found`   | Resource not found | Invalid resource UUID. |
| `409 Conflict`    | Duplicate entity collision | Duplicate active purchase request, duplicate review, duplicate payment initiation, email already registered. |
| `429 Too Many Requests` | Rate limit exceeded | Exceeded 100 requests per 15 min window (or 20 per 15 min for auth). |
| `500 Server Error`| Internal application error | Database connection failure or unhandled exception. |
