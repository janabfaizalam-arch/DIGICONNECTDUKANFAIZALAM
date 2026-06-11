"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { 
  FileText, 
  UploadCloud, 
  CreditCard, 
  CheckCircle, 
  Printer, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck,
  FileCheck
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

// Pricing rates in INR
const RATES = {
  A4: { mono: 2.0, color: 10.0 },
  A3: { mono: 5.0, color: 20.0 },
};

export default function PrintPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  // Input states
  const [mobile, setMobile] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [copies, setCopies] = useState(1);
  const [pages, setPages] = useState(1);
  const [paperSize, setPaperSize] = useState<"A4" | "A3">("A4");
  const [colorMode, setColorMode] = useState<"mono" | "color">("mono");

  // Flow states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    storage_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    pages?: number;
  } | null>(null);

  const [isPaying, setIsPaying] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobNumber, setJobNumber] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"form" | "tracking">("form");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Price Calculation
  const unitRate = RATES[paperSize][colorMode];
  const totalPrice = pages * copies * unitRate;

  useEffect(() => {
    // Check if Razorpay is already available
    if (typeof window !== "undefined" && window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, []);

  // Poll job status if tracking
  useEffect(() => {
    if (currentStep !== "tracking" || !jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/print/jobs/status?job_id=${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setPrintStatus(data.print_status);

        if (data.print_status === "printed" || data.print_status === "failed") {
          clearInterval(interval);
          if (data.print_status === "printed") {
            toastSuccess("Your document was printed successfully!");
          } else {
            toastError("Printing failed. Please check with the shopkeeper.");
          }
        }
      } catch (err) {
        console.error("Error polling print status:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentStep, jobId, toastSuccess, toastError]);

  // Handle Drag & Drop / File Select
  const handleFileChange = async (selectedFile: File) => {
    const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "docx"];
    const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";
    
    if (!allowedExtensions.includes(ext)) {
      toastError("Unsupported file type. Please upload a PDF, Image, or Word doc.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toastError("File size exceeds 20MB. Please upload a smaller file.");
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setUploadedFile(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/print/jobs/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadedFile(data);
      if (data.pages && data.pages > 0) {
        setPages(data.pages);
      } else {
        setPages(1);
      }
      toastSuccess("File uploaded successfully!");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to upload file";
      toastError(msg);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Trigger Razorpay Checkout
  const handlePayment = async () => {
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      toastError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!uploadedFile) {
      toastError("Please upload a file first.");
      return;
    }

    if (!window.Razorpay || !razorpayLoaded) {
      toastError("Payment service is loading. Please try again in a moment.");
      return;
    }

    setIsPaying(true);

    try {
      // Step 1: Create print job record on server
      const createRes = await fetch("/api/print/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_mobile: cleanMobile,
          copies,
          pages,
          paper_size: paperSize,
          color_mode: colorMode,
          file_name: uploadedFile.file_name,
          file_size: uploadedFile.file_size,
          mime_type: uploadedFile.mime_type,
          storage_path: uploadedFile.storage_path,
          amount: totalPrice,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || "Failed to create print job");
      }

      const localJobId = createData.job_id;
      const localJobNumber = createData.job_number;

      // Step 2: Create Razorpay Order
      const orderRes = await fetch("/api/print/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: localJobId }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to initiate payment");
      }

      // Step 3: Launch Razorpay Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "DigiConnect Dukan",
        description: `Print Job #${localJobNumber}`,
        order_id: orderData.order_id,
        prefill: {
          contact: cleanMobile,
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
            toastError("Payment cancelled.");
          },
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            setIsPaying(true);
            // Step 4: Verify Payment Signature
            const verifyRes = await fetch("/api/print/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                job_id: localJobId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            // Success! Set states to track
            setJobId(localJobId);
            setJobNumber(localJobNumber);
            setPrintStatus("queued");
            setCurrentStep("tracking");
            toastSuccess("Payment verified! Job added to queue.");
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to verify payment";
            toastError(msg);
          } finally {
            setIsPaying(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on("payment.failed", (resp: { error?: { description?: string; reason?: string } }) => {
        setIsPaying(false);
        toastError(resp.error?.description || resp.error?.reason || "Payment failed");
      });
      rzpInstance.open();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to process print request";
      toastError(msg);
      setIsPaying(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setUploadedFile(null);
    setCopies(1);
    setPages(1);
    setMobile("");
    setJobId(null);
    setJobNumber(null);
    setPrintStatus(null);
    setCurrentStep("form");
  };

  // Helper formatting for file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <main className="homepage-mobile-shell min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayLoaded(true)}
      />

      <div className="container-shell max-w-md px-4 py-8">
        {/* Step 1: Print Selection Form */}
        {currentStep === "form" ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-2 animate-bounce">
                <Printer className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">Paid Instant Print</h1>
              <p className="text-slate-500 text-sm">Scan, upload, pay, and collect your physical prints securely.</p>
            </div>

            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed transition-all p-6 text-center ${
                file
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-300 hover:border-blue-400 bg-white"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
              />

              {isUploading ? (
                <div className="py-6 space-y-3">
                  <RefreshCw className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
                  <p className="text-sm font-semibold text-blue-600">Uploading and scanning document...</p>
                </div>
              ) : file ? (
                <div className="py-2 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                  {uploadedFile?.pages && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                      <FileCheck className="w-3.5 h-3.5" />
                      Detected {uploadedFile.pages} Page(s)
                    </div>
                  )}
                  <p className="text-xs text-blue-600 font-semibold underline">Click to change file</p>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Choose file or drag here</p>
                    <p className="text-xs text-slate-400">PDF, JPG, PNG, DOCX (Max 20MB)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Configuration Options */}
            {uploadedFile && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5 reveal-on-scroll">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Print Options</h3>
                
                {/* Paper Size & Color Mode */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Paper Size</label>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value as "A4" | "A3")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="A3">A3 (Large)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Color Mode</label>
                    <select
                      value={colorMode}
                      onChange={(e) => setColorMode(e.target.value as "mono" | "color")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="mono">B&W (₹{RATES[paperSize].mono}/page)</option>
                      <option value="color">Color (₹{RATES[paperSize].color}/page)</option>
                    </select>
                  </div>
                </div>

                {/* Copies & Manual Pages */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Pages to Print</label>
                    <input
                      type="number"
                      min={1}
                      value={pages}
                      onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Copies</label>
                    <input
                      type="number"
                      min={1}
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Customer mobile */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number (For Receipt & Tracking)</label>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Pricing summary */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Estimated Price:</span>
                  <span className="text-lg font-extrabold text-blue-600">₹{totalPrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Pay Button */}
            {uploadedFile && (
              <button
                type="button"
                onClick={handlePayment}
                disabled={isPaying || mobile.length < 10}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isPaying ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
                {isPaying ? "Processing Order..." : `Pay ₹${totalPrice.toFixed(2)} Securely`}
              </button>
            )}

            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600 leading-normal">
                Files are uploaded to a private secure storage bucket and are permanently auto-deleted from the server within 24 hours of printing.
              </p>
            </div>
          </div>
        ) : (
          /* Step 2: Receipt & Status Tracking */
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-6 text-center reveal-on-scroll">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-500 mx-auto border border-green-200">
              <CheckCircle className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold">Payment Successful!</h2>
              <p className="text-sm text-slate-500">Your print job is now registered.</p>
            </div>

            {/* Job Details Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 text-left space-y-2">
              <div className="flex justify-between border-b border-slate-200/50 pb-2">
                <span className="text-xs font-bold text-slate-400">Job Number</span>
                <span className="text-sm font-extrabold text-blue-600">{jobNumber}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Total Copies</span>
                <span>{copies} copy (A4, {colorMode === "mono" ? "B&W" : "Color"})</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Amount Paid</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Printing Status Steps */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Print Status</h3>
              
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    printStatus === "printed" 
                      ? "bg-green-100 text-green-600" 
                      : printStatus === "failed" 
                      ? "bg-red-100 text-red-600" 
                      : "bg-blue-100 text-blue-600"
                  }`}>
                    {printStatus === "printed" ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : printStatus === "failed" ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Printer className="w-5 h-5 animate-pulse" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800 capitalize">
                      {printStatus === "queued" && "Queued - Waiting for Agent"}
                      {printStatus === "printing" && "Printing now..."}
                      {printStatus === "printed" && "Printed Successfully!"}
                      {printStatus === "failed" && "Printing Failed"}
                      {!["queued", "printing", "printed", "failed"].includes(printStatus || "") && "Processing..."}
                    </p>
                    <p className="text-xs text-slate-500">
                      {printStatus === "queued" && "The shop print agent will lock and print your file shortly."}
                      {printStatus === "printing" && "The agent is sending your file to the physical printer."}
                      {printStatus === "printed" && "Please collect your copies from the counter."}
                      {printStatus === "failed" && "Physical printer error. Please contact shop staff."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Back button */}
            <button
              type="button"
              onClick={resetForm}
              className="w-full h-11 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Print Another Document
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
