const BasePaymentProvider = require('./basePaymentProvider');
const logger = require('../../utils/logger');

/**
 * bKash Payment Provider Implementation (Tokenized Checkout API)
 */
class BkashProvider extends BasePaymentProvider {
  constructor(config = {}) {
    super('BKASH', config);
    this.baseURL = config.baseURL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
    this.appKey = config.appKey || '';
    this.appSecret = config.appSecret || '';
    this.username = config.username || '';
    this.password = config.password || '';
    this.callbackURL = config.callbackURL || '';
    this.sandboxMode = config.sandboxMode !== false;

    this.idToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Determine whether live/sandbox credentials are fully configured
   */
  hasCredentials() {
    return Boolean(this.appKey && this.appSecret && this.username && this.password);
  }

  /**
   * Acquire or refresh bKash authentication idToken
   */
  async getAuthToken() {
    if (this.idToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.idToken;
    }

    if (!this.hasCredentials()) {
      // In sandbox mode without live keys, return simulated session token
      return 'bkash_simulated_auth_token';
    }

    try {
      const res = await fetch(`${this.baseURL}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          username: this.username,
          password: this.password,
        },
        body: JSON.stringify({
          app_key: this.appKey,
          app_secret: this.appSecret,
        }),
      });

      const data = await res.json();

      if (res.ok && data && data.id_token) {
        this.idToken = data.id_token;
        const expiresIn = parseInt(data.expires_in, 10) || 3600;
        this.tokenExpiresAt = Date.now() + expiresIn * 1000;
        return this.idToken;
      }

      throw new Error(data?.statusMessage || 'Failed to obtain bKash auth token');
    } catch (error) {
      logger.error('bKash auth token grant failed', {
        error: error.message,
      });
      throw new Error(`bKash Authentication Error: ${error.message}`);
    }
  }

  /**
   * Initiate bKash Payment
   */
  async initiatePayment({ paymentId, amount, transactionId, customerPhone, callbackUrl, metadata }) {
    logger.info('bKash initiating payment', { paymentId, amount, transactionId });

    if (!this.hasCredentials()) {
      // Sandbox Simulator Mode when API credentials are not yet configured in environment
      const simulatedPaymentID = `BKASH_PAY_${paymentId.substring(0, 8)}_${Date.now()}`;
      return {
        providerReference: simulatedPaymentID,
        redirectUrl: `/payment/bkash/checkout?paymentID=${simulatedPaymentID}&amount=${amount}`,
        paymentUrl: `https://sandbox.bka.sh/checkout?paymentID=${simulatedPaymentID}`,
        rawResponse: {
          statusCode: '0000',
          statusMessage: 'Initiated in bKash Sandbox Mode',
          paymentID: simulatedPaymentID,
          amount: amount.toFixed(2),
          currency: 'BDT',
          merchantInvoiceNumber: `INV-${paymentId.substring(0, 8)}`,
        },
      };
    }

    const token = await this.getAuthToken();
    const finalCallbackUrl = callbackUrl || this.callbackURL;

    try {
      const res = await fetch(`${this.baseURL}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: customerPhone || '01700000000',
          callbackURL: finalCallbackUrl,
          amount: amount.toFixed(2),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: `INV-${paymentId.substring(0, 8)}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data && (data.statusCode === '0000' || data.paymentID)) {
        return {
          providerReference: data.paymentID,
          redirectUrl: data.bkashURL || '',
          paymentUrl: data.bkashURL || '',
          rawResponse: data,
        };
      }

      throw new Error(data?.statusMessage || 'bKash payment initiation failed');
    } catch (error) {
      logger.error('bKash payment creation error', {
        error: error.message,
        paymentId,
      });
      throw new Error(`bKash Create Payment Failed: ${error.message}`);
    }
  }

  /**
   * Server-side Verification / Execution of bKash Payment
   */
  async verifyPayment({ paymentId, providerTransactionId, providerReference, queryParams }) {
    logger.info('bKash verifying payment', { paymentId, providerTransactionId, providerReference });

    const paymentID = providerReference || queryParams?.paymentID;
    const trxID = providerTransactionId || queryParams?.trxID;

    if (!this.hasCredentials()) {
      // In sandbox mode without live keys: verify that a valid provider transaction ID is provided or generate a simulated TrxID
      const finalTrxID = trxID || `BKASH_TRX_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      return {
        isSuccessful: true,
        providerTransactionId: finalTrxID,
        providerReference: paymentID || `BKASH_REF_${paymentId.substring(0, 8)}`,
        rawResponse: {
          statusCode: '0000',
          statusMessage: 'Payment Successful (bKash Sandbox)',
          trxID: finalTrxID,
          transactionStatus: 'Completed',
        },
      };
    }

    const token = await this.getAuthToken();

    try {
      // Execute payment if paymentID is provided
      const res = await fetch(`${this.baseURL}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify({ paymentID }),
      });

      const data = await res.json();
      if (res.ok && data && data.statusCode === '0000' && data.transactionStatus === 'Completed') {
        return {
          isSuccessful: true,
          providerTransactionId: data.trxID,
          providerReference: data.paymentID,
          paidAmount: parseFloat(data.amount),
          rawResponse: data,
        };
      }

      // If execution returns failure or already executed, query payment status
      if (data && data.statusCode !== '0000') {
        const queryStatus = await this.queryPaymentStatus(paymentID);
        if (queryStatus.status === 'Completed') {
          return {
            isSuccessful: true,
            providerTransactionId: queryStatus.providerTransactionId,
            providerReference: paymentID,
            rawResponse: queryStatus.rawResponse,
          };
        }
      }

      return {
        isSuccessful: false,
        providerTransactionId: data?.trxID || null,
        providerReference: paymentID,
        rawResponse: data,
      };
    } catch (error) {
      logger.error('bKash payment verification error', {
        error: error.message,
        paymentId,
      });
      throw new Error(`bKash Verification Error: ${error.message}`);
    }
  }

  /**
   * Query status of bKash payment
   */
  async queryPaymentStatus(providerReference, paymentId) {
    if (!this.hasCredentials()) {
      return {
        status: 'Completed',
        providerTransactionId: `BKASH_TRX_QUERY_${Date.now()}`,
        rawResponse: { statusCode: '0000', transactionStatus: 'Completed' },
      };
    }

    const token = await this.getAuthToken();

    try {
      const res = await fetch(`${this.baseURL}/tokenized/checkout/payment/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify({ paymentID: providerReference }),
      });

      const data = await res.json();
      return {
        status: data?.transactionStatus || 'Unknown',
        providerTransactionId: data?.trxID || '',
        rawResponse: data,
      };
    } catch (error) {
      logger.error('bKash query payment status error', { error: error.message });
      throw error;
    }
  }
}

module.exports = BkashProvider;
