-- ============================================================================
-- Smart Student Old Equipment Tracking and Resale Platform
-- Seed Data Script (PostgreSQL 15+)
-- ============================================================================

-- Clean existing data
TRUNCATE audit_logs, notifications, reviews, transactions, purchase_requests, equipment_images, equipment_listings, categories, users CASCADE;

-- ----------------------------------------------------------------------------
-- 1. SEED USERS (Default password for all seed users: Password123!)
-- ----------------------------------------------------------------------------
-- Admin Account
INSERT INTO users (id, student_id, full_name, email, password_hash, phone, department, role, avatar_url, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'ADMIN-001',
    'System Administrator',
    'admin@university.edu',
    '$2b$10$g/ZH8m9jRacJibCyICdZV.Znnzi/Tu15PQz8nlFmlsHh0cQ7rx4v6',
    '+1 (555) 019-2831',
    'Campus IT Administration',
    'admin',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    TRUE
);

-- Sample Seller Account
INSERT INTO users (id, student_id, full_name, email, password_hash, phone, department, role, avatar_url, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'STU-2023-0101',
    'Alex Rivera (Seller)',
    'seller.alex@university.edu',
    '$2b$10$g/ZH8m9jRacJibCyICdZV.Znnzi/Tu15PQz8nlFmlsHh0cQ7rx4v6',
    '+1 (555) 432-8765',
    'Computer Science & Engineering',
    'student',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    TRUE
);

-- Sample Buyer Account
INSERT INTO users (id, student_id, full_name, email, password_hash, phone, department, role, avatar_url, is_active)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'STU-2023-0202',
    'Sarah Jenkins (Buyer)',
    'buyer.sarah@university.edu',
    '$2b$10$g/ZH8m9jRacJibCyICdZV.Znnzi/Tu15PQz8nlFmlsHh0cQ7rx4v6',
    '+1 (555) 789-1234',
    'Electrical & Electronic Engineering',
    'student',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    TRUE
);

-- Additional Student User
INSERT INTO users (id, student_id, full_name, email, password_hash, phone, department, role, avatar_url, is_active)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'STU-2023-0303',
    'Michael Chang',
    'student.michael@university.edu',
    '$2b$10$g/ZH8m9jRacJibCyICdZV.Znnzi/Tu15PQz8nlFmlsHh0cQ7rx4v6',
    '+1 (555) 246-8109',
    'Mechanical Engineering',
    'student',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    TRUE
);

-- ----------------------------------------------------------------------------
-- 2. SEED CATEGORIES
-- ----------------------------------------------------------------------------
INSERT INTO categories (id, name, slug, description, icon, is_active) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'Laptops & Computing',
    'laptops-computing',
    'Laptops, tablets, monitors, keyboards, mice, and computer peripherals.',
    'laptop',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000002',
    'Scientific Calculators & Math',
    'scientific-calculators-math',
    'Graphing calculators, scientific calculators, math reference tables and tools.',
    'calculator',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000003',
    'Lab & Chemistry Equipment',
    'lab-chemistry-equipment',
    'Lab coats, safety goggles, molecular model kits, glassware, dissection kits.',
    'flask',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000004',
    'Engineering & Drawing Tools',
    'engineering-drawing-tools',
    'Drafting boards, T-squares, compass sets, calipers, 3D printing supplies.',
    'compass',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000005',
    'Textbooks & Study Materials',
    'textbooks-study-materials',
    'Engineering, medical, business, science textbooks, course packets, and notes.',
    'book-open',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000006',
    'Electronics & Microcontrollers',
    'electronics-microcontrollers',
    'Arduino, Raspberry Pi, ESP32, breadboards, sensors, soldering kits, multimeters.',
    'cpu',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000007',
    'Art & Architecture Kits',
    'art-architecture-kits',
    'Scale models, architectural cutting mats, precision knives, drafting pens.',
    'palette',
    TRUE
);

-- ----------------------------------------------------------------------------
-- 3. SEED EQUIPMENT LISTINGS
-- ----------------------------------------------------------------------------
-- Item 1: MacBook Pro 14" (Available)
INSERT INTO equipment_listings (id, seller_id, category_id, title, description, condition, price, original_price, brand, model_year, is_negotiable, status, admin_approval_status)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    '10000000-0000-0000-0000-000000000001', -- Laptops & Computing
    'MacBook Pro 14-inch M2 Pro (16GB RAM, 512GB SSD)',
    'Flawless condition MacBook Pro used for 2 semesters in CS coursework. Battery cycle count is under 80. Comes with original 67W MagSafe charger and protective carrying sleeve.',
    'like_new',
    1250.00,
    1999.00,
    'Apple',
    '2023',
    TRUE,
    'available',
    'approved'
);

-- Item 2: TI-84 Plus CE Graphing Calculator (Available)
INSERT INTO equipment_listings (id, seller_id, category_id, title, description, condition, price, original_price, brand, model_year, is_negotiable, status, admin_approval_status)
VALUES (
    '20000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    '10000000-0000-0000-0000-000000000002', -- Scientific Calculators & Math
    'Texas Instruments TI-84 Plus CE Color Graphing Calculator',
    'Color screen graphing calculator in Rose Gold. Clean, fully functional, battery holds charge for weeks. Essential for Calculus I-IV and Linear Algebra.',
    'good',
    75.00,
    140.00,
    'Texas Instruments',
    '2022',
    FALSE,
    'available',
    'approved'
);

-- Item 3: Arduino Mega 2560 Ultimate Starter Kit (Available)
INSERT INTO equipment_listings (id, seller_id, category_id, title, description, condition, price, original_price, brand, model_year, is_negotiable, status, admin_approval_status)
VALUES (
    '20000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    '10000000-0000-0000-0000-000000000006', -- Electronics & Microcontrollers
    'Arduino Mega 2560 Starter Kit w/ 45 Sensor Modules & LCD',
    'Complete robotics & embedded systems kit with Mega 2560 board, servo motors, stepper motors, RFID reader, and ultrasonic sensors. Used for Embedded Systems capstone.',
    'good',
    48.00,
    95.00,
    'Elegoo / Arduino',
    '2023',
    TRUE,
    'available',
    'approved'
);

-- Item 4: Organic Chemistry Molecular Model Student Kit (Sold / Completed)
INSERT INTO equipment_listings (id, seller_id, category_id, title, description, condition, price, original_price, brand, model_year, is_negotiable, status, admin_approval_status)
VALUES (
    '20000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    '10000000-0000-0000-0000-000000000003', -- Lab & Chemistry Equipment
    'Prentice Hall Organic Chemistry Molecular Model Set (240 Pieces)',
    'Complete ball-and-stick molecular model set with all bonds and atom pieces included. Essential for visualizing stereochemistry and reaction mechanisms.',
    'good',
    25.00,
    65.00,
    'Prentice Hall',
    '2022',
    FALSE,
    'sold',
    'approved'
);

-- Item 5: Rotring Rapid Drafting Board A3 (Reserved)
INSERT INTO equipment_listings (id, seller_id, category_id, title, description, condition, price, original_price, brand, model_year, is_negotiable, status, admin_approval_status)
VALUES (
    '20000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    '10000000-0000-0000-0000-000000000004', -- Engineering & Drawing Tools
    'Rotring Profil A3 Portable Drafting Drawing Board',
    'High precision drawing board with parallel straightedge and stop-and-go mechanism. Includes compass attachment clip. Minimal cosmetic marks.',
    'good',
    55.00,
    110.00,
    'Rotring',
    '2021',
    TRUE,
    'reserved',
    'approved'
);

-- Item 6: Campbell Biology 12th Edition Textbook (Available)
INSERT INTO equipment_listings (id, seller_id, category_id, title, description, condition, price, original_price, brand, model_year, is_negotiable, status, admin_approval_status)
VALUES (
    '20000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000001', -- Michael Chang (Student Seller)
    '10000000-0000-0000-0000-000000000005', -- Textbooks & Study Materials
    'Campbell Biology (12th Edition) Hardcover Textbook',
    'Standard textbook for General Biology I & II. Clean pages, no missing pages, light highlighter on first two chapters. Spine is strong.',
    'good',
    60.00,
    195.00,
    'Pearson',
    '2021',
    TRUE,
    'available',
    'approved'
);

-- Item 7: Handheld Digital Oscilloscope 100MHz (Available)
INSERT INTO equipment_listings (id, seller_id, category_id, title, description, condition, price, original_price, brand, model_year, is_negotiable, status, admin_approval_status)
VALUES (
    '20000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000001', -- Michael Chang (Student Seller)
    '10000000-0000-0000-0000-000000000006', -- Electronics & Microcontrollers
    'FNIRSI-1014D 2-in-1 Dual Channel Digital Oscilloscope 100MHz',
    'Dual channel portable benchtop oscilloscope with built-in DDS signal generator. 1GSa/s sampling rate. Comes with 2 probes and power adapter.',
    'like_new',
    140.00,
    220.00,
    'FNIRSI',
    '2023',
    FALSE,
    'available',
    'approved'
);

-- ----------------------------------------------------------------------------
-- 4. SEED EQUIPMENT IMAGES
-- ----------------------------------------------------------------------------
INSERT INTO equipment_images (equipment_id, image_url, is_primary) VALUES
-- MacBook Pro
('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', TRUE),
('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800', FALSE),

-- TI-84 Plus CE
('20000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800', TRUE),

-- Arduino Starter Kit
('20000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800', TRUE),

-- Organic Chemistry Kit
('20000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800', TRUE),

-- Drafting Board
('20000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800', TRUE),

-- Campbell Biology
('20000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', TRUE),

-- Oscilloscope
('20000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800', TRUE);

-- ----------------------------------------------------------------------------
-- 5. SEED PURCHASE REQUESTS
-- ----------------------------------------------------------------------------
-- Request 1: Completed purchase of Chemistry Kit by Sarah from Alex
INSERT INTO purchase_requests (id, equipment_id, buyer_id, seller_id, proposed_price, message, status)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000004', -- Chemistry Kit
    'c0000000-0000-0000-0000-000000000001', -- Sarah Jenkins (Buyer)
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    25.00,
    'Hi Alex! I need this molecular model kit for Chem 201 next week. Can we meet at the Science Library at 3 PM?',
    'accepted'
);

-- Request 2: Accepted request on Drafting Board by Sarah from Alex
INSERT INTO purchase_requests (id, equipment_id, buyer_id, seller_id, proposed_price, message, status)
VALUES (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000005', -- Drafting Board
    'c0000000-0000-0000-0000-000000000001', -- Sarah Jenkins (Buyer)
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    50.00,
    'Would you accept $50 for the Rotring drafting board? I can pick it up near the Engineering Building.',
    'accepted'
);

-- Request 3: Pending request on Arduino Starter Kit by Sarah from Alex
INSERT INTO purchase_requests (id, equipment_id, buyer_id, seller_id, proposed_price, message, status)
VALUES (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003', -- Arduino Starter Kit
    'c0000000-0000-0000-0000-000000000001', -- Sarah Jenkins (Buyer)
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    45.00,
    'Hi, is the Arduino kit still available? Offering $45 cash or campus pay.',
    'pending'
);

-- ----------------------------------------------------------------------------
-- 6. SEED TRANSACTIONS
-- ----------------------------------------------------------------------------
-- Transaction 1: Completed Transaction for Chemistry Kit
INSERT INTO transactions (id, purchase_request_id, equipment_id, buyer_id, seller_id, agreed_price, status, meeting_location, notes, completed_at)
VALUES (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001', -- Request 1
    '20000000-0000-0000-0000-000000000004', -- Chemistry Kit
    'c0000000-0000-0000-0000-000000000001', -- Sarah Jenkins (Buyer)
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    25.00,
    'completed',
    'Science & Engineering Library, 1st Floor Lobby',
    'Handover completed successfully. All 240 molecular pieces verified.',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Transaction 2: Accepted / In Progress Transaction for Drafting Board
INSERT INTO transactions (id, purchase_request_id, equipment_id, buyer_id, seller_id, agreed_price, status, meeting_location, notes)
VALUES (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002', -- Request 2
    '20000000-0000-0000-0000-000000000005', -- Drafting Board
    'c0000000-0000-0000-0000-000000000001', -- Sarah Jenkins (Buyer)
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    50.00,
    'accepted',
    'Engineering Building II, Student Lounge',
    'Scheduled meetup for Friday at 4:30 PM.'
);

-- ----------------------------------------------------------------------------
-- 7. SEED REVIEWS & RATINGS
-- ----------------------------------------------------------------------------
-- Sarah reviews Alex for the completed Chemistry Kit transaction
INSERT INTO reviews (id, transaction_id, equipment_id, reviewer_id, reviewee_id, rating, comment)
VALUES (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001', -- Completed Transaction
    '20000000-0000-0000-0000-000000000004', -- Chemistry Kit
    'c0000000-0000-0000-0000-000000000001', -- Sarah Jenkins (Buyer)
    'b0000000-0000-0000-0000-000000000001', -- Alex Rivera (Seller)
    5,
    'Great seller! Alex was right on time at the library and the molecular kit was in mint condition with all pieces present. Highly recommend!'
);

-- ----------------------------------------------------------------------------
-- 8. SEED NOTIFICATIONS
-- ----------------------------------------------------------------------------
INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type) VALUES
-- Notification to Alex (Seller) about new Arduino request
(
    'b0000000-0000-0000-0000-000000000001',
    'New Purchase Request Received',
    'Sarah Jenkins sent you a purchase request of $45.00 for Arduino Mega 2560 Starter Kit.',
    'request_received',
    FALSE,
    '30000000-0000-0000-0000-000000000003',
    'purchase_request'
),
-- Notification to Sarah (Buyer) about accepted drafting board request
(
    'c0000000-0000-0000-0000-000000000001',
    'Purchase Request Accepted',
    'Alex Rivera accepted your purchase request for Rotring Profil A3 Portable Drafting Drawing Board.',
    'request_status',
    TRUE,
    '30000000-0000-0000-0000-000000000002',
    'purchase_request'
),
-- Notification to Sarah (Buyer) to review completed transaction
(
    'c0000000-0000-0000-0000-000000000001',
    'Transaction Completed - Leave a Review',
    'Your transaction for Prentice Hall Molecular Model Set is complete! Please rate your experience with Alex Rivera.',
    'review_received',
    TRUE,
    '40000000-0000-0000-0000-000000000001',
    'transaction'
);

-- ----------------------------------------------------------------------------
-- 9. SEED AUDIT LOGS
-- ----------------------------------------------------------------------------
INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, ip_address)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'INITIALIZE_PLATFORM_CATEGORIES',
    'category',
    '10000000-0000-0000-0000-000000000001',
    '{"category_count": 7, "note": "Initial baseline academic equipment categories approved."}',
    '127.0.0.1'
);
