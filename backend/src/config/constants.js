/**
 * Platform Domain Constants & Enums
 * Smart Student Old Equipment Tracking and Resale Platform
 */

const USER_ROLES = Object.freeze({
  STUDENT: 'student',
  ADMIN: 'admin',
});

const EQUIPMENT_CONDITIONS = Object.freeze({
  NEW: 'new',
  LIKE_NEW: 'like_new',
  GOOD: 'good',
  FAIR: 'fair',
  USED: 'used',
});

const EQUIPMENT_STATUS = Object.freeze({
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  RESERVED: 'reserved',
  SOLD: 'sold',
  ARCHIVED: 'archived',
});

const APPROVAL_STATUS = Object.freeze({
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
});

const PURCHASE_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

const TRANSACTION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  SOLD: 'sold',
  COMPLETED: 'completed',
});

const NOTIFICATION_TYPES = Object.freeze({
  REQUEST_RECEIVED: 'request_received',
  REQUEST_STATUS: 'request_status',
  TRANSACTION_UPDATE: 'transaction_update',
  PAYMENT_UPDATE: 'payment_update',
  REVIEW_RECEIVED: 'review_received',
  SYSTEM_ALERT: 'system_alert',
});

const PAYMENT_METHODS = Object.freeze({
  BKASH: 'BKASH',
  NAGAD: 'NAGAD',
});

const PAYMENT_STATUS = Object.freeze({
  INITIATED: 'INITIATED',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

module.exports = {
  USER_ROLES,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_STATUS,
  APPROVAL_STATUS,
  PURCHASE_REQUEST_STATUS,
  TRANSACTION_STATUS,
  NOTIFICATION_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
};
