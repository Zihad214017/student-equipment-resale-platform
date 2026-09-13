/**
 * Base Abstract Payment Provider Interface
 * All payment gateway implementations (bKash, Nagad) must adhere to this contract.
 */
class BasePaymentProvider {
  constructor(name, config) {
    if (new.target === BasePaymentProvider) {
      throw new TypeError('Cannot construct BasePaymentProvider instances directly.');
    }
    this.name = name;
    this.config = config;
  }

  /**
   * Initiate a payment with the provider
   * @param {object} params
   * @param {string} params.paymentId - System internal payment UUID
   * @param {number} params.amount - Trusted payable amount in BDT / Currency
   * @param {string} params.transactionId - System transaction UUID
   * @param {string} [params.customerPhone] - Optional customer mobile number
   * @param {string} [params.callbackUrl] - Callback / Webhook destination URL
   * @param {object} [params.metadata] - Additional payment metadata
   * @returns {Promise<{ providerReference: string, redirectUrl: string, paymentUrl: string, rawResponse: object }>}
   */
  async initiatePayment(params) {
    throw new Error(`Method 'initiatePayment()' must be implemented by ${this.name} provider.`);
  }

  /**
   * Server-side verification of a payment with the provider
   * @param {object} params
   * @param {string} params.paymentId - System payment UUID
   * @param {string} params.providerTransactionId - Transaction ID returned by the provider (e.g., TrxID)
   * @param {string} [params.providerReference] - Payment ID / Order ID generated during initiation
   * @param {object} [params.queryParams] - Any callback query parameters
   * @returns {Promise<{ isSuccessful: boolean, providerTransactionId: string, paidAmount: number, rawResponse: object }>}
   */
  async verifyPayment(params) {
    throw new Error(`Method 'verifyPayment()' must be implemented by ${this.name} provider.`);
  }

  /**
   * Query status of an existing payment
   * @param {string} providerReference
   * @param {string} [paymentId]
   * @returns {Promise<{ status: string, providerTransactionId: string, rawResponse: object }>}
   */
  async queryPaymentStatus(providerReference, paymentId) {
    throw new Error(`Method 'queryPaymentStatus()' must be implemented by ${this.name} provider.`);
  }
}

module.exports = BasePaymentProvider;
