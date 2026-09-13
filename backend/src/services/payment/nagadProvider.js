const crypto = require('crypto');
const BasePaymentProvider = require('./basePaymentProvider');
const logger = require('../../utils/logger');

/**
 * Nagad Payment Gateway Provider Implementation
 */
class NagadProvider extends BasePaymentProvider {
  constructor(config = {}) {
    super('NAGAD', config);
    this.baseURL = config.baseURL || 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs';
    this.merchantID = config.merchantID || '';
    this.merchantNumber = config.merchantNumber || '';
    this.publicKey = config.publicKey || '';
    this.privateKey = config.privateKey || '';
    this.callbackURL = config.callbackURL || '';
    this.sandboxMode = config.sandboxMode !== false;
  }

  /**
   * Determine whether live/sandbox credentials are fully configured
   */
  hasCredentials() {
    return Boolean(this.merchantID && this.privateKey && this.publicKey);
  }

  /**
   * Helper to sign data using RSA-SHA256 with merchant private key
   */
  signData(data) {
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();
      return sign.sign(this.privateKey, 'base64');
    } catch (err) {
      logger.error('Nagad signing error', { error: err.message });
      return 'simulated_nagad_signature';
    }
  }

  /**
   * Initiate Nagad Payment
   */
  async initiatePayment({ paymentId, amount, transactionId, customerPhone, callbackUrl, metadata }) {
    logger.info('Nagad initiating payment', { paymentId, amount, transactionId });

    const orderId = `NAGAD_ORD_${paymentId.substring(0, 8)}_${Date.now()}`;
    const finalCallbackUrl = callbackUrl || this.callbackURL;

    if (!this.hasCredentials()) {
      // Sandbox Simulator Mode when API credentials are not yet configured in environment
      return {
        providerReference: orderId,
        redirectUrl: `/payment/nagad/checkout?orderId=${orderId}&amount=${amount}`,
        paymentUrl: `http://sandbox.mynagad.com/checkout?orderId=${orderId}`,
        rawResponse: {
          status: 'Success',
          message: 'Initiated in Nagad Sandbox Mode',
          orderId,
          amount: amount.toFixed(2),
          merchantId: this.merchantID || 'NAGAD_SANDBOX_MERCHANT',
        },
      };
    }

    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const sensitiveData = {
        merchantId: this.merchantID,
        datetime: timestamp,
        orderId: orderId,
        challenge: crypto.randomBytes(20).toString('hex'),
      };

      const res = await fetch(
        `${this.baseURL}/check-out/initialize/${this.merchantID}/${orderId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-IP-V4': '127.0.0.1',
            'X-KM-Client-Type': 'PC_WEB',
          },
          body: JSON.stringify({
            dateTime: timestamp,
            sensitiveData: JSON.stringify(sensitiveData),
            signature: this.signData(JSON.stringify(sensitiveData)),
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data && (data.callBackUrl || data.paymentReferenceId)) {
        return {
          providerReference: data.paymentReferenceId || orderId,
          redirectUrl: data.callBackUrl || '',
          paymentUrl: data.callBackUrl || '',
          rawResponse: data,
        };
      }

      throw new Error(data?.message || 'Nagad initialization failed');
    } catch (error) {
      logger.error('Nagad payment creation error', {
        error: error.message,
        paymentId,
      });
      throw new Error(`Nagad Initialization Error: ${error.message}`);
    }
  }

  /**
   * Server-side Verification of Nagad Payment
   */
  async verifyPayment({ paymentId, providerTransactionId, providerReference, queryParams }) {
    logger.info('Nagad verifying payment', { paymentId, providerTransactionId, providerReference });

    const paymentRefId = providerReference || queryParams?.payment_ref_id || queryParams?.order_id;
    const trxID = providerTransactionId || queryParams?.issuer_payment_ref || `NAGAD_TRX_${Date.now()}`;

    if (!this.hasCredentials()) {
      // In sandbox mode without live keys
      return {
        isSuccessful: true,
        providerTransactionId: trxID,
        providerReference: paymentRefId || `NAGAD_REF_${paymentId.substring(0, 8)}`,
        rawResponse: {
          status: 'Success',
          statusMessage: 'Payment Successful (Nagad Sandbox)',
          issuerPaymentRef: trxID,
        },
      };
    }

    try {
      const res = await fetch(
        `${this.baseURL}/verify/payment/${paymentRefId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-IP-V4': '127.0.0.1',
            'X-KM-Client-Type': 'PC_WEB',
          },
        }
      );

      const data = await res.json();
      const isSuccess = res.ok && data && (data.status === 'Success' || data.statusCode === '000');

      return {
        isSuccessful: isSuccess,
        providerTransactionId: data?.issuerPaymentRef || trxID,
        providerReference: paymentRefId,
        paidAmount: data?.amount ? parseFloat(data.amount) : undefined,
        rawResponse: data,
      };
    } catch (error) {
      logger.error('Nagad payment verification error', {
        error: error.message,
        paymentId,
      });
      throw new Error(`Nagad Verification Error: ${error.message}`);
    }
  }

  /**
   * Query status of Nagad payment
   */
  async queryPaymentStatus(providerReference, paymentId) {
    if (!this.hasCredentials()) {
      return {
        status: 'Success',
        providerTransactionId: `NAGAD_TRX_QUERY_${Date.now()}`,
        rawResponse: { status: 'Success' },
      };
    }

    try {
      const res = await fetch(
        `${this.baseURL}/verify/payment/${providerReference}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-IP-V4': '127.0.0.1',
            'X-KM-Client-Type': 'PC_WEB',
          },
        }
      );

      const data = await res.json();
      return {
        status: data?.status || 'Unknown',
        providerTransactionId: data?.issuerPaymentRef || '',
        rawResponse: data,
      };
    } catch (error) {
      logger.error('Nagad query payment status error', { error: error.message });
      throw error;
    }
  }
}

module.exports = NagadProvider;
