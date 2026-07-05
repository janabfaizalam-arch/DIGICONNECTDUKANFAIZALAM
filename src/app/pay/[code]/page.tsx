"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, AlertCircle, ArrowLeft, Receipt, Loader2 } from "lucide-react";
import { WhatsappAuthFlow } from "@/components/auth/whatsapp-auth-flow";
import { RazorpayCheckoutButton } from "@/components/payments/razorpay-checkout-button";

type PaymentLinkDetails = {
  success: boolean;
  status: "pending" | "paid" | "expired" | "cancelled";
  code: string;
  amount: number;
  baseAmount: number;
  gstAmount: number;
  customerName: string;
  partnerName: string;
  serviceName: string;
  applicationId: string;
  expiresAt: string;
  remainingSeconds?: number;
  paidAt?: string;
  error?: string;
};

export default function CustomerPaymentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<PaymentLinkDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name?: string } | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payment-links/details?code=${code}`);
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to load payment link details.");
      } else {
        setDetails(data);
        if (data.remainingSeconds !== undefined) {
          setTimeLeft(data.remainingSeconds);
        }
      }
    } catch {
      setErrorMessage("Failed to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  const checkAuth = async () => {
    try {
      setCheckingAuth(true);
      const res = await fetch("/api/customer/profile");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setCurrentUser(data.profile);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    checkAuth();
  }, [code, fetchDetails]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Securing payment gateway...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
          <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link Unavailable</h1>
          <p className="text-slate-600 mb-8">{errorMessage}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 px-6 py-3 rounded-2xl transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" /> Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (details && details.status === "paid") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
          <div className="h-16 w-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Completed</h1>
          <p className="text-slate-500 text-sm mb-6">This invoice was successfully processed.</p>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Service</span>
              <span className="text-sm font-semibold text-slate-800">{details.serviceName}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Customer</span>
              <span className="text-sm font-medium text-slate-700">{details.customerName}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Service Partner</span>
              <span className="text-sm font-semibold text-slate-800 text-blue-600">{details.partnerName}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200/60 pt-3 mt-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Amount Paid</span>
              <span className="text-lg font-bold text-slate-900">₹{details.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <Link
            href="/customer/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-6 py-4 rounded-2xl transition-colors duration-200 shadow-lg shadow-blue-500/25"
          >
            <Receipt className="h-4 w-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in -> Auth flow is shown
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
          <div className="text-center mb-8">
            <div className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
              <span className="bg-blue-600 text-white p-1.5 rounded-xl text-sm font-bold flex items-center justify-center h-8 w-8">D</span>
              <span>DigiConnect Dukan</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Verify Your Identity</h2>
            <p className="text-slate-500 text-sm mt-1">Please verify using WhatsApp OTP to view & pay this link.</p>
          </div>
          
          <WhatsappAuthFlow 
            purpose="login" 
            onSuccess={() => checkAuth()} 
          />
        </div>
      </div>
    );
  }

  // Logged in -> Pay details and pay button
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col justify-between">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1 rounded-xl font-bold flex items-center justify-center h-8 w-8 text-sm">D</span>
              <span className="font-bold text-slate-900 text-lg">DigiConnect Dukan</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-100/50">
              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-ping"></span>
              {timeLeft !== null && timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : "Payment Pending"}
            </span>
          </div>

          <div className="mb-2">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Application Payment</span>
            <h1 className="text-2xl font-extrabold text-slate-800 mt-1">{details?.serviceName}</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">Link Code: {details?.code}</p>
        </div>

        {/* Invoice Body */}
        <div className="p-8 bg-slate-50/50 flex-grow">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Customer Name</span>
              <span className="text-sm font-semibold text-slate-800">{details?.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Service Partner</span>
              <span className="text-sm font-semibold text-slate-850 text-blue-600">{details?.partnerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Base Service Fee</span>
              <span className="text-sm font-medium text-slate-700">₹{details?.baseAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">GST (18% Included)</span>
              <span className="text-sm font-medium text-slate-700">₹{details?.gstAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200/60 pt-4 mt-4">
              <span className="text-base font-bold text-slate-800">Total Amount</span>
              <span className="text-2xl font-black text-slate-900">₹{details?.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Secure Payment Badge */}
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50/50 rounded-2xl border border-blue-100/50 mb-8 text-blue-700">
            <ShieldCheck className="h-5 w-5 flex-shrink-0" />
            <span className="text-xs font-semibold tracking-wide uppercase">Secured by Razorpay • 256-bit SSL</span>
          </div>
          
          {/* Checkout Button */}
          {details && (
            <div className="w-full">
              <RazorpayCheckoutButton
                amountPaise={details.amount * 100}
                receipt={details.code}
                applicationId={details.applicationId}
                customer={{
                  name: details.customerName,
                  email: currentUser?.email || "",
                }}
                onVerified={() => fetchDetails()}
                description={`Payment for ${details.serviceName}`}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-xs text-slate-400">© 2026 DigiConnect Dukan. All payments are securely routed and invoiced. Partners are registered with RNoS India Pvt Ltd.</p>
      </div>
    </div>
  );
}
