"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { 
  User, School, BookOpen, FileText, CheckCircle, CreditCard, 
  ArrowLeft, ArrowRight, UploadCloud, Trash2, Shield, Lock, Check,
  AlertTriangle, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { calculateCashbackForFreshPayment } from "@/lib/reward-rules";
import { createClient } from "@/lib/supabase/browser";
import { getRealPayableAmount } from "@/lib/wallet";
import { trackApplicationSubmit } from "@/lib/google-analytics";
import { trackSubmitApplication } from "@/lib/meta-pixel";
import { RazorpayCheckoutButton, type VerifiedRazorpayPayment } from "@/components/payments/razorpay-checkout-button";
import { cn } from "@/lib/utils";

type Subject = {
  id: string;
  name: string;
  icon: string;
  classes: number[];
};

type FormClientProps = {
  user: any;
  initialProfileFields: {
    mobile: string;
    pincode: string;
    city: string;
    state: string;
  };
  isProfileIncomplete: boolean;
  pricePerSubject: number;
  oldPricePerSubject: number;
  activeSession: string;
  subjectsList: Subject[];
  initialSubjects: string[];
};

type FormState = {
  studentName: string;
  studentDob: string;
  studentGender: string;
  studentClass: number;
  parentMobile: string;
  parentEmail: string;
  schoolName: string;
  schoolBoard: string;
  schoolPincode: string;
  schoolCity: string;
  schoolState: string;
  schoolAddress: string;
  selectedSubjects: string[];
};

const defaultFormState = (initialMobile: string, initialSubjects: string[]): FormState => ({
  studentName: "",
  studentDob: "",
  studentGender: "",
  studentClass: 3,
  parentMobile: initialMobile || "",
  parentEmail: "",
  schoolName: "",
  schoolBoard: "CBSE",
  schoolPincode: "",
  schoolCity: "",
  schoolState: "",
  schoolAddress: "",
  selectedSubjects: initialSubjects,
});

export function CscOlympiadFormClient({
  user,
  initialProfileFields,
  pricePerSubject,
  oldPricePerSubject,
  activeSession,
  subjectsList,
  initialSubjects,
}: FormClientProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formValues, setFormValues] = useState<FormState>(() => defaultFormState(initialProfileFields.mobile, initialSubjects));
  
  // Files
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [studyProof, setStudyProof] = useState<File | null>(null);

  // Upload Progress
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Checkout Payment states
  const [razorpayPayment, setRazorpayPayment] = useState<VerifiedRazorpayPayment | null>(null);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState("");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [appliedCouponDiscount, setAppliedCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);

  // Pincode Lookup state
  const [pincodeStatus, setPincodeStatus] = useState("");

  // Draft recovery alert
  const [showResumeAlert, setShowResumeAlert] = useState(false);

  const steps = [
    { num: 1, label: "Student", icon: User },
    { num: 2, label: "School", icon: School },
    { num: 3, label: "Subject", icon: BookOpen },
    { num: 4, label: "Documents", icon: UploadCloud },
    { num: 5, label: "Review", icon: FileText },
    { num: 6, label: "Payment", icon: CreditCard },
  ];

  // Filter subjects based on selected class
  const classFilteredSubjects = useMemo(() => {
    return subjectsList.filter(subject => subject.classes.includes(Number(formValues.studentClass)));
  }, [subjectsList, formValues.studentClass]);

  // Pricing calculations
  const totalSubjectsCount = formValues.selectedSubjects.length;
  const basePrice = totalSubjectsCount * oldPricePerSubject;
  const originalPayableFee = totalSubjectsCount * pricePerSubject;
  const subtotalBeforeDiscounts = originalPayableFee;
  const finalPayableBeforeWallet = Math.max(0, subtotalBeforeDiscounts - appliedCouponDiscount);

  // Wallet
  const wallet = useWallet(finalPayableBeforeWallet);
  const maxUsableWalletRedeem = wallet.balance > 0 ? Math.min(wallet.balance, finalPayableBeforeWallet * 0.5) : 0;
  const walletUseAmount = useWalletBalance ? maxUsableWalletRedeem : 0;
  
  const realPayableAmount = getRealPayableAmount(finalPayableBeforeWallet, walletUseAmount);
  const payableAmountPaise = Math.round(realPayableAmount * 100);

  // Auto-save & Restore Draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("csc_olympiad_apply_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.studentName || parsed.parentMobile) {
          setShowResumeAlert(true);
        }
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  const loadDraft = () => {
    const saved = localStorage.getItem("csc_olympiad_apply_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormValues(prev => ({
          ...prev,
          ...parsed,
          // ensure initial subjects matching parameters don't get erased if empty
          selectedSubjects: parsed.selectedSubjects?.length ? parsed.selectedSubjects : prev.selectedSubjects
        }));
        success("Draft application restored successfully.");
      } catch (e) {
        toastError("Could not load draft.");
      }
    }
    setShowResumeAlert(false);
  };

  const discardDraft = () => {
    localStorage.removeItem("csc_olympiad_apply_draft");
    setShowResumeAlert(false);
  };

  // Save changes to localStorage on edit
  useEffect(() => {
    if (formValues.studentName || formValues.parentMobile || formValues.schoolName || formValues.selectedSubjects.length) {
      localStorage.setItem("csc_olympiad_apply_draft", JSON.stringify(formValues));
    }
  }, [formValues]);

  // Pincode Lookup
  useEffect(() => {
    const pincode = formValues.schoolPincode.trim();
    if (pincode.length !== 6) return;
    
    setPincodeStatus("Verifying pincode...");
    const controller = new AbortController();
    fetch(`/api/pincode?pincode=${encodeURIComponent(pincode)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.city && data.state) {
          setFormValues(prev => ({
            ...prev,
            schoolCity: data.city,
            schoolState: data.state
          }));
          setPincodeStatus("");
        } else {
          setPincodeStatus("Invalid pincode.");
        }
      })
      .catch(() => {
        setPincodeStatus("");
      });
    return () => controller.abort();
  }, [formValues.schoolPincode]);

  // Validators per step
  const validateStep = (stepNum: number): string | null => {
    if (stepNum === 1) {
      if (!formValues.studentName.trim()) return "Student Name is required.";
      if (!formValues.studentDob) return "Student Date of Birth is required.";
      if (!formValues.studentGender) return "Student Gender is required.";
      if (!formValues.parentMobile) return "Parent Mobile is required.";
      if (!/^[6-9]\d{9}$/.test(formValues.parentMobile)) return "Enter a valid 10-digit Indian mobile number.";
      if (!formValues.parentEmail.trim()) return "Parent Email is required.";
      if (!/\S+@\S+\.\S+/.test(formValues.parentEmail)) return "Enter a valid email address.";
    }
    if (stepNum === 2) {
      if (!formValues.schoolName.trim()) return "School Name is required.";
      if (!formValues.schoolBoard) return "School Board is required.";
      if (!formValues.schoolPincode || formValues.schoolPincode.length !== 6) return "Valid 6-digit School Pincode is required.";
      if (!formValues.schoolCity.trim()) return "School City is required.";
      if (!formValues.schoolState.trim()) return "School State is required.";
      if (!formValues.schoolAddress.trim()) return "School Street Address is required.";
    }
    if (stepNum === 3) {
      if (formValues.selectedSubjects.length === 0) return "Please select at least one subject to register.";
    }
    if (stepNum === 4) {
      if (!passportPhoto) return "Passport Size Photograph upload is required.";
      if (!studyProof) return "School ID Card or Enrollment Proof upload is required.";
    }
    return null;
  };

  const handleNextStep = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      toastError(errorMsg);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Subject toggler
  const toggleSubject = (id: string) => {
    if (formValues.selectedSubjects.includes(id)) {
      setFormValues(prev => ({
        ...prev,
        selectedSubjects: prev.selectedSubjects.filter(x => x !== id)
      }));
    } else {
      setFormValues(prev => ({
        ...prev,
        selectedSubjects: [...prev.selectedSubjects, id]
      }));
    }
    // Reset payment states since amount changes
    setRazorpayPayment(null);
  };

  // Coupons
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setCouponApplying(true);
    try {
      const response = await fetch(`/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          serviceSlug: "csc-olympiad",
          amount: subtotalBeforeDiscounts,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success && result.valid) {
        setAppliedCouponCode(couponCode.trim().toUpperCase());
        setAppliedCouponDiscount(Number(result.discountAmount ?? 0));
        success("Discount coupon applied successfully!");
      } else {
        setCouponError(result.message || "Invalid coupon code.");
      }
    } catch {
      setCouponError("Coupon validation failed.");
    } finally {
      setCouponApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCouponCode("");
    setAppliedCouponDiscount(0);
    setCouponCode("");
    setCouponError(null);
    success("Coupon removed.");
  };

  // File Upload Handlers with Progress Simulations
  const handleFileChange = (type: "photo" | "proof", file: File | null) => {
    if (!file) {
      if (type === "photo") setPassportPhoto(null);
      if (type === "proof") setStudyProof(null);
      return;
    }
    
    // validation
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      toastError("Upload files in PDF, JPG, or PNG formats only.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError("File must be smaller than 5MB.");
      return;
    }

    setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    let prog = 0;
    const interval = setInterval(() => {
      prog += 20;
      setUploadProgress(prev => ({ ...prev, [type]: prog }));
      if (prog >= 100) {
        clearInterval(interval);
        if (type === "photo") setPassportPhoto(file);
        if (type === "proof") setStudyProof(file);
      }
    }, 60);
  };

  // Submit Handler
  const handleSubmitApplication = async (paymentObject: VerifiedRazorpayPayment | null) => {
    setIsSubmitting(true);
    setProgressText("Uploading files and securing credentials...");

    const supabase = createClient();
    if (!supabase) {
      toastError("Supabase configuration error.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) {
        throw new Error("Session expired. Please login again.");
      }

      // 1. Upload files to Supabase Storage Bucket 'documents'
      const uploadedDocs: any[] = [];
      const filesToUpload = [
        { file: passportPhoto, type: "Passport Photo" },
        { file: studyProof, type: "School ID / Study Proof" }
      ];

      // We will perform API-based document insert during application payload submit.
      // So we will append them to the multipart form.
      const submitFormData = new FormData();
      const documentTypes: string[] = [];

      for (const item of filesToUpload) {
        if (item.file) {
          submitFormData.append("documents", item.file, item.file.name);
          documentTypes.push(item.type);
        }
      }

      // Construct detailed application form metadata
      const payload = {
        serviceSlug: "csc-olympiad",
        serviceSlugs: ["csc-olympiad"],
        customer: {
          name: formValues.studentName,
          mobile: formValues.parentMobile,
          email: formValues.parentEmail,
          city: formValues.schoolCity,
          message: `Olympiad Registration for Class ${formValues.studentClass} - subjects: ${formValues.selectedSubjects.join(", ")}`
        },
        details: {
          session: activeSession,
          studentName: formValues.studentName,
          studentDob: formValues.studentDob,
          studentGender: formValues.studentGender,
          studentClass: String(formValues.studentClass),
          schoolName: formValues.schoolName,
          schoolBoard: formValues.schoolBoard,
          schoolPincode: formValues.schoolPincode,
          schoolCity: formValues.schoolCity,
          schoolState: formValues.schoolState,
          schoolAddress: formValues.schoolAddress,
          selectedSubjects: formValues.selectedSubjects.join(","),
        },
        razorpayPayment: paymentObject,
        walletUseAmount: walletUseAmount,
        originalPrice: basePrice,
        discountedPrice: subtotalBeforeDiscounts,
        couponCode: appliedCouponCode,
        couponDiscount: appliedCouponDiscount,
        walletUsed: walletUseAmount,
        freshAmount: realPayableAmount,
        finalAmount: finalPayableBeforeWallet,
      };

      submitFormData.append("payload", JSON.stringify(payload));
      submitFormData.append("documentTypes", JSON.stringify(documentTypes));

      setProgressText("Submitting registration package...");
      const response = await fetch("/api/applications", {
        method: "POST",
        body: submitFormData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "Submission failed.");
      }

      // Clean local storage draft upon success
      localStorage.removeItem("csc_olympiad_apply_draft");

      success("Olympiad registration submitted successfully!");
      router.push(result.invoiceId ? `/invoice/${result.invoiceId}` : "/customer/dashboard");
      router.refresh();
    } catch (err: any) {
      toastError(err.message || "An error occurred during submission.");
      setIsSubmitting(false);
    }
  };

  // Zero payment wallet checkout flow
  const handleZeroPaymentCheckout = async () => {
    if (realPayableAmount !== 0) return;
    setIsSubmitting(true);
    setProgressText("Creating zero-payment order...");
    try {
      const zeroResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 0,
          serviceSlug: "csc-olympiad",
          serviceSlugs: ["csc-olympiad"],
          walletUseAmount: walletUseAmount,
          applicationDraft: {
            customer: {
              name: formValues.studentName,
              mobile: formValues.parentMobile,
              email: formValues.parentEmail,
              city: formValues.schoolCity,
            },
            details: {
              selectedSubjects: formValues.selectedSubjects.join(","),
            }
          }
        })
      });
      const zeroResult = await zeroResponse.json();
      if (!zeroResponse.ok) {
        throw new Error(zeroResult.error || "Wallet order creation failed.");
      }

      // Mock a payment verified package
      const mockPayment: VerifiedRazorpayPayment = {
        razorpay_payment_id: "wallet_only",
        razorpay_order_id: "wallet_only",
        razorpay_signature: "wallet_only",
        application_id: zeroResult.application_id ?? zeroResult.application_ids?.[0],
        application_ids: zeroResult.application_ids,
      };

      await handleSubmitApplication(mockPayment);
    } catch (err: any) {
      toastError(err.message || "Zero payment checkout failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-2xl p-5 md:p-8 bg-white border border-slate-100 shadow-xl overflow-hidden relative">
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-slate-800">{progressText}</p>
        </div>
      )}

      {/* Resume Draft alert */}
      {showResumeAlert && (
        <div className="mb-6 p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <AlertTriangle className="h-4.5 w-4.5 text-blue-600" />
            <span>We found a saved draft of your application. Would you like to resume?</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size={"sm" as any} onClick={loadDraft} className="h-8 rounded-lg cursor-pointer">
              Resume Draft
            </Button>
            <Button size={"sm" as any} variant="outline" onClick={discardDraft} className="h-8 rounded-lg text-slate-500 cursor-pointer">
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4 overflow-x-auto no-scrollbar">
        {steps.map((step) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.num;
          const isActive = currentStep === step.num;
          
          return (
            <div key={step.num} className="flex items-center gap-1.5 grow last:grow-0 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 border",
                  isCompleted 
                    ? "bg-blue-600 border-blue-600 text-white"
                    : isActive
                      ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10 scale-105"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                )}>
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : step.num}
                </span>
                <span className={cn(
                  "text-xs font-black hidden sm:inline",
                  isActive ? "text-slate-900" : isCompleted ? "text-blue-600" : "text-slate-400"
                )}>
                  {step.label}
                </span>
              </div>
              {step.num < 6 && (
                <div className={cn(
                  "h-[2px] grow min-w-4 max-w-16 mx-1.5 transition-all duration-500",
                  isCompleted ? "bg-blue-500" : "bg-slate-100"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Steps */}
      <div className="min-h-80">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Student details */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-base font-extrabold text-slate-900">Student Profile</h3>
                <p className="text-xs text-slate-500">Provide basic identification details of the participating student.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Student Full Name *</label>
                  <Input 
                    value={formValues.studentName} 
                    onChange={e => setFormValues({...formValues, studentName: e.target.value})} 
                    placeholder="Enter student name" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Date of Birth (DOB) *</label>
                  <Input 
                    type="date"
                    value={formValues.studentDob} 
                    onChange={e => setFormValues({...formValues, studentDob: e.target.value})} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Gender *</label>
                  <select 
                    value={formValues.studentGender} 
                    onChange={e => setFormValues({...formValues, studentGender: e.target.value})} 
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Student Class *</label>
                  <select 
                    value={formValues.studentClass} 
                    onChange={e => {
                      const newCls = Number(e.target.value);
                      setFormValues({
                        ...formValues, 
                        studentClass: newCls,
                        selectedSubjects: [] // reset subjects selection when class changes to prevent validation errors
                      });
                      setRazorpayPayment(null);
                    }} 
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold focus:border-blue-500 outline-none bg-white"
                  >
                    {[3,4,5,6,7,8,9,10,11,12].map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Parent Mobile Number *</label>
                  <Input 
                    type="tel"
                    maxLength={10}
                    value={formValues.parentMobile} 
                    onChange={e => setFormValues({...formValues, parentMobile: e.target.value.replace(/\D/g, "")})} 
                    placeholder="10 digit contact number" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Parent Email Address *</label>
                  <Input 
                    type="email"
                    value={formValues.parentEmail} 
                    onChange={e => setFormValues({...formValues, parentEmail: e.target.value.trim()})} 
                    placeholder="Enter email address" 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: School details */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-base font-extrabold text-slate-900">School Profile</h3>
                <p className="text-xs text-slate-500">Input details of the school where the student is currently enrolled.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">School Name *</label>
                  <Input 
                    value={formValues.schoolName} 
                    onChange={e => setFormValues({...formValues, schoolName: e.target.value})} 
                    placeholder="Enter school name" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">School Board *</label>
                  <select 
                    value={formValues.schoolBoard} 
                    onChange={e => setFormValues({...formValues, schoolBoard: e.target.value})} 
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB">IB</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-700">School Pincode *</label>
                  <Input 
                    maxLength={6}
                    value={formValues.schoolPincode} 
                    onChange={e => setFormValues({...formValues, schoolPincode: e.target.value.replace(/\D/g, "")})} 
                    placeholder="6 digit area pincode" 
                  />
                  {pincodeStatus && (
                    <span className="absolute bottom-[-16px] left-0 text-[10px] font-bold text-blue-600">{pincodeStatus}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">City / District *</label>
                  <Input 
                    value={formValues.schoolCity} 
                    onChange={e => setFormValues({...formValues, schoolCity: e.target.value})} 
                    placeholder="City" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">State *</label>
                  <Input 
                    value={formValues.schoolState} 
                    onChange={e => setFormValues({...formValues, schoolState: e.target.value})} 
                    placeholder="State" 
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Street Address *</label>
                  <Input 
                    value={formValues.schoolAddress} 
                    onChange={e => setFormValues({...formValues, schoolAddress: e.target.value})} 
                    placeholder="School complete address" 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Subject selection */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4 flex justify-between items-end">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Subject Selection</h3>
                  <p className="text-xs text-slate-500">Register subjects available for Class {formValues.studentClass}.</p>
                </div>
                <span className="text-xs font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-full shrink-0">
                  ₹{pricePerSubject}/Subject
                </span>
              </div>

              {classFilteredSubjects.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 py-6 text-center">No subjects mapped for Class {formValues.studentClass}. Contact support.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {classFilteredSubjects.map((sub) => {
                    const isSelected = formValues.selectedSubjects.includes(sub.id);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => toggleSubject(sub.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none",
                          isSelected
                            ? "border-blue-500 bg-blue-50/20"
                            : "border-slate-100 hover:border-slate-200 bg-slate-50/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg text-sm shrink-0",
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          )}>
                            {/* Generic subject numbering or indicator */}
                            <BookOpen className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-xs font-extrabold text-slate-900">{sub.name}</span>
                        </div>
                        
                        <div className={cn(
                          "h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200",
                          isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 text-transparent"
                        )}>
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalSubjectsCount > 0 && (
                <div className="mt-6 p-4.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-700 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span>Subjects Selected ({totalSubjectsCount}):</span>
                    <span>{formValues.selectedSubjects.map(id => subjectsList.find(s => s.id === id)?.name).join(", ")}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/50 pt-2 mt-1">
                    <span>Total Facilitation Fee:</span>
                    <span className="text-slate-900">₹{subtotalBeforeDiscounts}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Documents Upload */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-base font-extrabold text-slate-900">Documents Verification</h3>
                <p className="text-xs text-slate-500">Upload clean verification files. Maximum size: 5MB. Formats: PDF, JPG, PNG.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                
                {/* passport photo upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">Passport Size Photo *</label>
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50 text-center hover:bg-slate-50 transition relative overflow-hidden flex flex-col items-center">
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={e => handleFileChange("photo", e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={Boolean(uploadProgress.photo && uploadProgress.photo < 100)}
                    />
                    
                    {passportPhoto ? (
                      <div className="w-full flex flex-col items-center">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-full px-4">{passportPhoto.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-1">{(passportPhoto.size / 1024 / 1024).toFixed(2)} MB</span>
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size={"sm" as any} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileChange("photo", null);
                          }}
                          className="mt-3 text-red-500 hover:text-red-600 cursor-pointer h-7"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-slate-400 mb-3" />
                        <span className="text-xs font-extrabold text-blue-600 block">Choose Passport Photo</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-1">JPG or PNG format</span>
                      </>
                    )}

                    {uploadProgress.photo !== undefined && uploadProgress.photo < 100 && (
                      <div className="absolute bottom-0 left-0 w-full bg-slate-200 h-1">
                        <div className="bg-blue-600 h-1 transition-all duration-100" style={{ width: `${uploadProgress.photo}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* enrollment proof upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">School ID / Study Proof *</label>
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50 text-center hover:bg-slate-50 transition relative overflow-hidden flex flex-col items-center">
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={e => handleFileChange("proof", e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={Boolean(uploadProgress.proof && uploadProgress.proof < 100)}
                    />
                    
                    {studyProof ? (
                      <div className="w-full flex flex-col items-center">
                        <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-full px-4">{studyProof.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-1">{(studyProof.size / 1024 / 1024).toFixed(2)} MB</span>
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size={"sm" as any} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileChange("proof", null);
                          }}
                          className="mt-3 text-red-500 hover:text-red-600 cursor-pointer h-7"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-slate-400 mb-3" />
                        <span className="text-xs font-extrabold text-blue-600 block">Choose School ID / Proof</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-1">PDF, JPG or PNG format</span>
                      </>
                    )}

                    {uploadProgress.proof !== undefined && uploadProgress.proof < 100 && (
                      <div className="absolute bottom-0 left-0 w-full bg-slate-200 h-1">
                        <div className="bg-blue-600 h-1 transition-all duration-100" style={{ width: `${uploadProgress.proof}%` }} />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 5: Review details */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-base font-extrabold text-slate-900">Application Review</h3>
                <p className="text-xs text-slate-500">Double check the student and board parameters prior to checkout.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-xs font-bold text-slate-700 bg-slate-50/70 p-5 rounded-2xl border border-slate-100/50">
                <div className="space-y-2">
                  <h4 className="text-slate-900 border-b border-slate-200 pb-1.5 font-black uppercase text-[10px] tracking-wider">Student details</h4>
                  <p><span className="text-slate-400 font-semibold">Name:</span> {formValues.studentName}</p>
                  <p><span className="text-slate-400 font-semibold">DOB:</span> {formValues.studentDob}</p>
                  <p><span className="text-slate-400 font-semibold">Gender:</span> {formValues.studentGender}</p>
                  <p><span className="text-slate-400 font-semibold">Class:</span> Class {formValues.studentClass}</p>
                  <p><span className="text-slate-400 font-semibold">Mobile:</span> {formValues.parentMobile}</p>
                  <p><span className="text-slate-400 font-semibold">Email:</span> {formValues.parentEmail}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-slate-900 border-b border-slate-200 pb-1.5 font-black uppercase text-[10px] tracking-wider">School details</h4>
                  <p><span className="text-slate-400 font-semibold">School Name:</span> {formValues.schoolName}</p>
                  <p><span className="text-slate-400 font-semibold">Board:</span> {formValues.schoolBoard}</p>
                  <p><span className="text-slate-400 font-semibold">Address:</span> {formValues.schoolAddress}</p>
                  <p><span className="text-slate-400 font-semibold">Pincode:</span> {formValues.schoolPincode}</p>
                  <p><span className="text-slate-400 font-semibold">City:</span> {formValues.schoolCity}</p>
                  <p><span className="text-slate-400 font-semibold">State:</span> {formValues.schoolState}</p>
                </div>

                <div className="md:col-span-2 space-y-2 mt-2">
                  <h4 className="text-slate-900 border-b border-slate-200 pb-1.5 font-black uppercase text-[10px] tracking-wider">Registered subjects</h4>
                  <p className="text-slate-800 text-sm font-black">
                    {formValues.selectedSubjects.map(id => subjectsList.find(s => s.id === id)?.name).join(", ")}
                  </p>
                </div>

                <div className="md:col-span-2 space-y-2 mt-2">
                  <h4 className="text-slate-900 border-b border-slate-200 pb-1.5 font-black uppercase text-[10px] tracking-wider">Uploaded documents</h4>
                  <div className="flex gap-4">
                    <p className="flex items-center gap-1.5"><span className="text-slate-400 font-semibold">Photo:</span> {passportPhoto?.name}</p>
                    <p className="flex items-center gap-1.5"><span className="text-slate-400 font-semibold">ID Proof:</span> {studyProof?.name}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Checkout payment */}
          {currentStep === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-base font-extrabold text-slate-900">Application Checkout</h3>
                <p className="text-xs text-slate-500">Apply coupon codes and redeem wallet balance to complete payment verification.</p>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3.5 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span>Standard Registration Fee ({totalSubjectsCount} subject{totalSubjectsCount > 1 ? "s" : ""}):</span>
                  <span className="line-through text-slate-400">₹{basePrice}</span>
                </div>
                
                <div className="flex justify-between text-blue-600 bg-blue-50/50 p-2 rounded-xl border border-blue-100/30">
                  <span>DigiConnect Dukan Special Offer:</span>
                  <span>-₹{basePrice - subtotalBeforeDiscounts}</span>
                </div>

                {appliedCouponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/30">
                    <span>Coupon Discount Applied ({appliedCouponCode}):</span>
                    <span>-₹{appliedCouponDiscount}</span>
                  </div>
                )}

                {walletUseAmount > 0 && (
                  <div className="flex justify-between text-indigo-600 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/30">
                    <span>Wallet Cashback Redeemed (50% cap):</span>
                    <span>-₹{walletUseAmount}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-black text-slate-950">
                  <span>Net Payable Amount:</span>
                  <span className="text-blue-600">₹{realPayableAmount}</span>
                </div>
              </div>

              {/* Coupon code inputs */}
              {appliedCouponCode ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 text-xs font-extrabold text-emerald-800">
                  <span>Coupon {appliedCouponCode} applied! Saved ₹{appliedCouponDiscount}</span>
                  <button type="button" onClick={removeCoupon} className="text-red-500 hover:text-red-600 cursor-pointer">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Have a Discount Coupon?</label>
                  <div className="flex gap-2">
                    <Input 
                      value={couponCode} 
                      onChange={e => setCouponCode(e.target.value.trim().toUpperCase())} 
                      placeholder="ENTER COUPON CODE" 
                      className="uppercase"
                      disabled={couponApplying}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={applyCoupon} 
                      disabled={couponApplying || !couponCode.trim()}
                      className="cursor-pointer"
                    >
                      Apply
                    </Button>
                  </div>
                  {couponError && (
                    <span className="text-[10px] font-bold text-red-500">{couponError}</span>
                  )}
                </div>
              )}

              {/* Wallet adjustment */}
              {wallet.balance > 0 && (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-slate-800 block">Redeem DigiWallet Balance</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      Available: ₹{wallet.balance.toFixed(2)} | Usable limit: ₹{maxUsableWalletRedeem}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={useWalletBalance}
                      onChange={e => {
                        setUseWalletBalance(e.target.checked);
                        setRazorpayPayment(null); // Reset payment authorization
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}

              {/* Final Submit action checks */}
              <div className="mt-6">
                {realPayableAmount === 0 ? (
                  <Button
                    type="button"
                    onClick={handleZeroPaymentCheckout}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-blue-500/15 cursor-pointer"
                  >
                    Complete Wallet Checkout
                  </Button>
                ) : razorpayPayment ? (
                  <Button
                    type="button"
                    onClick={() => handleSubmitApplication(razorpayPayment)}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-blue-500/15 cursor-pointer"
                  >
                    Submit CSC Olympiad Application
                  </Button>
                ) : (
                  <RazorpayCheckoutButton
                    amountPaise={payableAmountPaise}
                    receipt={`csc-ol-${Date.now()}`}
                    serviceSlug="csc-olympiad"
                    serviceSlugs={["csc-olympiad"]}
                    walletUseAmount={walletUseAmount}
                    couponCode={appliedCouponCode || undefined}
                    customer={{
                      name: formValues.studentName,
                      email: formValues.parentEmail,
                      mobile: formValues.parentMobile,
                    }}
                    applicationDraft={{
                      customer: {
                        name: formValues.studentName,
                        email: formValues.parentEmail,
                        mobile: formValues.parentMobile,
                        city: formValues.schoolCity,
                      },
                      details: {
                        selectedSubjects: formValues.selectedSubjects.join(","),
                      }
                    }}
                    onVerified={(payment) => {
                      setRazorpayPayment(payment);
                      success("Checkout verified. You can now submit your application.");
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Control Buttons */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-50 pt-4">
        {currentStep > 1 && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={handlePrevStep}
            className="flex items-center gap-2 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>
        )}
        
        <div className="grow" />

        {currentStep < 6 ? (
          <Button 
            type="button" 
            onClick={handleNextStep}
            className="flex items-center gap-2 rounded-xl cursor-pointer"
          >
            <span>Next Step</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Safety Notice */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 text-[10px] leading-relaxed text-slate-400 flex items-start gap-3">
        <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Payment checkouts are proctored by Razorpay with 256-bit encryption. All uploads are locked inside Supabase secure buckets. DigiConnect Dukan coordinators audit applications to prevent incorrect school board codes or duplicate entry rejections.
        </span>
      </div>
    </Card>
  );
}
