import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Tag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import ErrorAlert from '../common/ErrorAlert';
import { formatCurrency } from '../../utils/formatters';

const PaymentModal = ({ isOpen, onClose, transaction, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('BKASH'); // 'BKASH' | 'NAGAD'
  const [customerPhone, setCustomerPhone] = useState('');
  const [stage, setStage] = useState('select'); // 'select' | 'processing' | 'verify' | 'success'
  const [paymentSession, setPaymentSession] = useState(null);
  const [providerTrxId, setProviderTrxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifiedPayment, setVerifiedPayment] = useState(null);

  if (!transaction) return null;

  const payableAmount = parseFloat(transaction.agreed_price || transaction.price || 0);

  const handleReset = () => {
    setStage('select');
    setPaymentSession(null);
    setProviderTrxId('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleInitiate = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await paymentApi.initiatePayment({
        transaction_id: transaction.id,
        payment_method: paymentMethod,
        customer_phone: customerPhone.trim() || undefined,
      });

      if (res && res.data) {
        setPaymentSession(res.data);
        setStage('verify');
      }
    } catch (err) {
      setError(err?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!paymentSession) return;

    setLoading(true);
    setError(null);

    try {
      const res = await paymentApi.verifyPayment(paymentSession.payment_id, {
        provider_transaction_id: providerTrxId.trim() || undefined,
        provider_reference: paymentSession.provider_reference,
      });

      if (res && res.data) {
        setVerifiedPayment(res.data);
        setStage('success');
        if (onSuccess) {
          onSuccess(res.data);
        }
      }
    } catch (err) {
      setError(err?.message || 'Payment verification failed. Please verify your transaction reference.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        stage === 'success'
          ? 'Payment Confirmed'
          : stage === 'verify'
          ? 'Complete Mobile Payment'
          : 'Checkout & Pay'
      }
    >
      <div className="space-y-5">
        <ErrorAlert message={error} onDismiss={() => setError(null)} />

        {/* 1. Item Summary & Trusted Amount */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Purchasing Equipment
            </span>
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {transaction.equipment_title || 'Equipment Item'}
            </h4>
            <p className="text-xs text-slate-500">
              Seller: <strong className="text-slate-700">{transaction.seller_name || 'Seller'}</strong>
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-semibold text-slate-400 block">Total Payable</span>
            <span className="text-xl font-extrabold text-indigo-600">
              {formatCurrency(payableAmount)}
            </span>
          </div>
        </div>

        {/* Stage 1: Select Payment Method & Phone */}
        {stage === 'select' && (
          <form onSubmit={handleInitiate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Mobile Banking Method *
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* bKash Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BKASH')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-28 relative overflow-hidden ${
                    paymentMethod === 'BKASH'
                      ? 'border-pink-500 bg-pink-50/50 shadow-sm ring-2 ring-pink-100'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-extrabold text-base tracking-tight text-pink-600">
                      bKash
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                      Instant
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">bKash Checkout</p>
                    <p className="text-[10px] text-slate-500">Fast mobile wallet payment</p>
                  </div>
                </button>

                {/* Nagad Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('NAGAD')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-28 relative overflow-hidden ${
                    paymentMethod === 'NAGAD'
                      ? 'border-orange-500 bg-orange-50/50 shadow-sm ring-2 ring-orange-100'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-extrabold text-base tracking-tight text-orange-600">
                      Nagad
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      Direct
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Nagad Pay</p>
                    <p className="text-[10px] text-slate-500">Postal financial service</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Customer Wallet Number (Optional) */}
            <Input
              label="Sender Mobile / Wallet Number (Optional)"
              name="customerPhone"
              placeholder="e.g. 017XXXXXXXX"
              icon={Smartphone}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              helperText="Optional for sandbox verification. Live gateway will open payment portal."
            />

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Encrypted campus payment. Funds are securely tracked and verified before physical handover.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                icon={CreditCard}
                className={paymentMethod === 'BKASH' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-orange-600 hover:bg-orange-700'}
              >
                Proceed with {paymentMethod === 'BKASH' ? 'bKash' : 'Nagad'} ({formatCurrency(payableAmount)})
              </Button>
            </div>
          </form>
        )}

        {/* Stage 2: Complete / Verify Payment */}
        {stage === 'verify' && paymentSession && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Payment Method:</span>
                <span className="font-bold text-indigo-700 uppercase">
                  {paymentSession.payment_method}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Gateway Reference:</span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {paymentSession.provider_reference}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Amount Due:</span>
                <span className="font-extrabold text-sm text-slate-900">
                  {formatCurrency(paymentSession.amount)}
                </span>
              </div>
            </div>

            <Input
              label="Payment Transaction ID (TrxID) / Reference"
              placeholder="e.g. 9K28XLP1A (Leave blank for automatic sandbox test)"
              value={providerTrxId}
              onChange={(e) => setProviderTrxId(e.target.value)}
              helperText="Enter the SMS TrxID received from your mobile wallet, or submit to auto-verify in test environment."
            />

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStage('select')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                ← Back to methods
              </button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Later
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  loading={loading}
                  icon={CheckCircle2}
                >
                  Verify & Confirm Payment
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Stage 3: Success Confirmation Receipt */}
        {stage === 'success' && verifiedPayment && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your payment of <strong className="text-slate-800">{formatCurrency(verifiedPayment.amount)}</strong> via {verifiedPayment.payment_method} has been verified.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction TrxID:</span>
                <span className="font-mono font-bold text-slate-800">
                  {verifiedPayment.provider_transaction_id || 'VERIFIED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Item Status:</span>
                <span className="font-semibold text-emerald-700 uppercase">Paid / Reserved</span>
              </div>
            </div>

            <p className="text-xs text-indigo-700 font-medium bg-indigo-50 p-2.5 rounded-xl">
              📍 Next step: Coordinate with <strong>{verifiedPayment.seller_name}</strong> to meet on campus and receive your equipment. Once received, mark delivery complete to review!
            </p>

            <Button variant="primary" onClick={handleClose} className="w-full">
              Done & View Transactions
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentModal;
