"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  User, School, BookOpen, FileText, CheckCircle, CreditCard, 
  ArrowLeft, ArrowRight, UploadCloud, Trash2, Lock, Check,
  AlertTriangle, RefreshCw, Smartphone, Building
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { createClient } from "@/lib/supabase/browser";
import { getRealPayableAmount } from "@/lib/wallet";
import { RazorpayCheckoutButton, type VerifiedRazorpayPayment } from "@/components/payments/razorpay-checkout-button";
import { cn } from "@/lib/utils";

type Subject = {
  id: string;
  name: string;
  icon: string;
  classes: number[];
};

type FormClientProps = {
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
  fatherName: string;
  studentMedium: string;
  parentMobile: string;
  parentEmail: string;
  studentState: string;
  studentCity: string;
  studentAddress: string;
  schoolName: string;
  schoolBoard: string;
  schoolPincode: string;
  schoolCity: string;
  schoolState: string;
  schoolAddress: string;
  selectedSubjects: string[];
};

const defaultFormState = (initialMobile: string, initialSubjects: string[], initialFields: FormClientProps["initialProfileFields"]): FormState => ({
  studentName: "",
  studentDob: "",
  studentGender: "",
  studentClass: 3,
  fatherName: "",
  studentMedium: "English",
  parentMobile: initialMobile || "",
  parentEmail: "",
  studentState: initialFields.state || "",
  studentCity: initialFields.city || "",
  studentAddress: "",
  schoolName: "",
  schoolBoard: "CBSE",
  schoolPincode: initialFields.pincode || "",
  schoolCity: initialFields.city || "",
  schoolState: initialFields.state || "",
  schoolAddress: "",
  selectedSubjects: initialSubjects,
});

export function CscOlympiadFormClient({
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
  const [formValues, setFormValues] = useState<FormState>(() => 
    defaultFormState(initialProfileFields.mobile, initialSubjects, initialProfileFields)
  );
  
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
    { num: 1, label: "Student Details", icon: User },
    { num: 2, label: "Parent / Contact", icon: Smartphone },
    { num: 3, label: "School Details", icon: School },
    { num: 4, label: "Subjects & Medium", icon: BookOpen },
    { num: 5, label: "Documents Hub", icon: UploadCloud },
    { num: 6, label: "Review & Checkout", icon: CreditCard },
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
          selectedSubjects: parsed.selectedSubjects?.length ? parsed.selectedSubjects : prev.selectedSubjects
        }));
        success("Draft application restored successfully.");
      } catch {
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

  // Pincode Lookup for School
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
      if (!formValues.studentName.trim()) return "Student Full Name is required.";
      if (!formValues.studentDob) return "Student Date of Birth is required.";
      if (!formValues.studentGender) return "Student Gender is required.";
      if (!formValues.fatherName.trim()) return "Father Name is required.";
    }
    if (stepNum === 2) {
      if (!formValues.parentMobile) return "Parent Mobile is required.";
      if (!/^[6-9]\d{9}$/.test(formValues.parentMobile)) return "Enter a valid 10-digit Indian mobile number.";
      if (!formValues.parentEmail.trim()) return "Parent Email is required.";
      if (!/\S+@\S+\.\S+/.test(formValues.parentEmail)) return "Enter a valid email address.";
      if (!formValues.studentState.trim()) return "Student State is required.";
      if (!formValues.studentCity.trim()) return "Student City is required.";
      if (!formValues.studentAddress.trim()) return "Student Street Address is required.";
    }
    if (stepNum === 3) {
      if (!formValues.schoolName.trim()) return "School Name is required.";
      if (!formValues.schoolBoard) return "School Board is required.";
      if (!formValues.schoolPincode || formValues.schoolPincode.length !== 6) return "Valid 6-digit School Pincode is required.";
      if (!formValues.schoolCity.trim()) return "School City is required.";
      if (!formValues.schoolState.trim()) return "School State is required.";
      if (!formValues.schoolAddress.trim()) return "School Street Address is required.";
    }
    if (stepNum === 4) {
      if (formValues.selectedSubjects.length === 0) return "Please select at least one subject to register.";
      if (!formValues.studentMedium) return "Language Medium choice is required.";
    }
    if (stepNum === 5) {
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

      const submitFormData = new FormData();
      const documentTypes: string[] = [];

      if (passportPhoto) {
        submitFormData.append("documents", passportPhoto, passportPhoto.name);
        documentTypes.push("Passport Photo");
      }
      if (studyProof) {
        submitFormData.append("documents", studyProof, studyProof.name);
        documentTypes.push("School ID / Study Proof");
      }

      const payload = {
        serviceSlug: "csc-olympiad",
        serviceSlugs: ["csc-olympiad"],
        customer: {
          name: formValues.studentName,
          mobile: formValues.parentMobile,
          email: formValues.parentEmail,
          city: formValues.studentCity,
          message: `Olympiad Registration for Class ${formValues.studentClass} - subjects: ${formValues.selectedSubjects.join(", ")}`
        },
        details: {
          session: activeSession,
          studentName: formValues.studentName,
          studentDob: formValues.studentDob,
          studentGender: formValues.studentGender,
          studentClass: String(formValues.studentClass),
          fatherName: formValues.fatherName,
          studentMedium: formValues.studentMedium,
          studentState: formValues.studentState,
          studentCity: formValues.studentCity,
          studentAddress: formValues.studentAddress,
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

      localStorage.removeItem("csc_olympiad_apply_draft");
      success("Olympiad registration submitted successfully!");
      router.push(result.invoiceId ? `/invoice/${result.invoiceId}` : "/customer/dashboard");
      router.refresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "An error occurred during submission.");
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
              city: formValues.studentCity,
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

      const mockPayment: VerifiedRazorpayPayment = {
        razorpay_payment_id: "wallet_only",
        razorpay_order_id: "wallet_only",
        razorpay_signature: "wallet_only",
        application_id: zeroResult.application_id ?? zeroResult.application_ids?.[0],
        application_ids: zeroResult.application_ids,
      };

      await handleSubmitApplication(mockPayment);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Zero payment checkout failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="rounded-3xl p-5 md:p-8 bg-white/80 border border-slate-200/60 backdrop-blur-md shadow-xl overflow-hidden relative text-left">
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-center text-slate-850">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-slate-700">{progressText}</p>
        </div>
      )}

      {/* Resume Draft alert */}
      {showResumeAlert && (
        <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <AlertTriangle className="h-4.5 w-4.5 text-blue-600" />
            <span>We found a saved draft of your application. Would you like to resume?</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={loadDraft} className="h-8 rounded-lg cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold select-none text-xs">
              Resume Draft
            </Button>
            <Button variant="outline" onClick={discardDraft} className="h-8 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer select-none border-slate-200 hover:bg-slate-50 text-xs">
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Wizard Step Progress Tracker */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4 overflow-x-auto no-scrollbar">
        {steps.map((step) => {
          const isCompleted = currentStep > step.num;
          const isActive = currentStep === step.num;
          const StepIcon = step.icon;
          
          return (
            <div key={step.num} className="flex items-center gap-1.5 grow last:grow-0 shrink-0 select-none">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all duration-300 border",
                  isCompleted 
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                    : isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                )}>
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : <StepIcon className="h-4 w-4" />}
                </span>
                <span className={cn(
                  "text-xs font-black hidden lg:inline",
                  isActive ? "text-blue-600" : isCompleted ? "text-emerald-600" : "text-slate-400"
                )}>
                  {step.label}
                </span>
              </div>
              {step.num < 6 && (
                <div className={cn(
                  "h-[2px] grow min-w-4 max-w-16 mx-1.5 transition-all duration-500",
                  isCompleted ? "bg-emerald-500" : "bg-slate-100"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Steps */}
      <div className="min-h-80 text-xs text-slate-700 font-semibold">
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
                <h3 className="text-sm font-black text-slate-900">Student Identification Profile</h3>
                <p className="text-slate-500 mt-0.5">Provide basic identification parameters of the student.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Student Full Name *</label>
                  <Input 
                    value={formValues.studentName} 
                    onChange={e => setFormValues({...formValues, studentName: e.target.value})} 
                    placeholder="Enter student name as in school files" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Date of Birth (DOB) *</label>
                  <Input 
                    type="date"
                    value={formValues.studentDob} 
                    onChange={e => setFormValues({...formValues, studentDob: e.target.value})} 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Gender *</label>
                  <select 
                    value={formValues.studentGender} 
                    onChange={e => setFormValues({...formValues, studentGender: e.target.value})} 
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Father Full Name *</label>
                  <Input 
                    value={formValues.fatherName} 
                    onChange={e => setFormValues({...formValues, fatherName: e.target.value})} 
                    placeholder="Enter father's name" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Student Class / Grade *</label>
                  <select 
                    value={formValues.studentClass} 
                    onChange={e => {
                      const newCls = Number(e.target.value);
                      setFormValues({
                        ...formValues, 
                        studentClass: newCls,
                        selectedSubjects: [] // reset subjects selection when class changes
                      });
                      setRazorpayPayment(null);
                    }} 
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700"
                  >
                    {[3,4,5,6,7,8,9,10,11,12].map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Parent/Contact details */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-black text-slate-900">Parent / Communication Details</h3>
                <p className="text-slate-505 mt-0.5">Enter contact coordinates to receive proctor keys and dates notifications.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Parent Mobile Number *</label>
                  <Input 
                    type="tel"
                    maxLength={10}
                    value={formValues.parentMobile} 
                    onChange={e => setFormValues({...formValues, parentMobile: e.target.value.replace(/\D/g, "")})} 
                    placeholder="10 digit contact number" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Parent Email Address *</label>
                  <Input 
                    type="email"
                    value={formValues.parentEmail} 
                    onChange={e => setFormValues({...formValues, parentEmail: e.target.value.trim()})} 
                    placeholder="name@domain.com" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Candidate State *</label>
                  <Input 
                    value={formValues.studentState} 
                    onChange={e => setFormValues({...formValues, studentState: e.target.value})} 
                    placeholder="State" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Candidate City / District *</label>
                  <Input 
                    value={formValues.studentCity} 
                    onChange={e => setFormValues({...formValues, studentCity: e.target.value})} 
                    placeholder="City / District" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Student Street Address *</label>
                  <Input 
                    value={formValues.studentAddress} 
                    onChange={e => setFormValues({...formValues, studentAddress: e.target.value})} 
                    placeholder="Street Address, House No, Locality" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: School details */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-black text-slate-900">School Profile</h3>
                <p className="text-slate-505 mt-0.5">Input details of the school where student is currently studying.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">School Name *</label>
                  <Input 
                    value={formValues.schoolName} 
                    onChange={e => setFormValues({...formValues, schoolName: e.target.value})} 
                    placeholder="Enter school name" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">School Board *</label>
                  <select 
                    value={formValues.schoolBoard} 
                    onChange={e => setFormValues({...formValues, schoolBoard: e.target.value})} 
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700"
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
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                  {pincodeStatus && (
                    <span className="absolute bottom-[-16px] left-0 text-[10px] font-bold text-blue-600">{pincodeStatus}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">School City / District *</label>
                  <Input 
                    value={formValues.schoolCity} 
                    onChange={e => setFormValues({...formValues, schoolCity: e.target.value})} 
                    placeholder="City" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">School State *</label>
                  <Input 
                    value={formValues.schoolState} 
                    onChange={e => setFormValues({...formValues, schoolState: e.target.value})} 
                    placeholder="State" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">School Address *</label>
                  <Input 
                    value={formValues.schoolAddress} 
                    onChange={e => setFormValues({...formValues, schoolAddress: e.target.value})} 
                    placeholder="School complete address" 
                    className="bg-white border-slate-200 text-slate-800 rounded-lg"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Subjects & Medium selection */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4 flex justify-between items-end">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Subject & Language Choice</h3>
                  <p className="text-slate-505 mt-0.5">Register subjects available for Class {formValues.studentClass}.</p>
                </div>
                <span className="text-xs font-black bg-cyan-50 border border-cyan-200 text-cyan-700 px-3 py-1 rounded-full shrink-0">
                  ₹{pricePerSubject}/Subject
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 max-w-xs">
                  <label className="text-xs font-bold text-slate-700">Choose Language Medium *</label>
                  <select 
                    value={formValues.studentMedium} 
                    onChange={e => setFormValues({...formValues, studentMedium: e.target.value})} 
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700 font-bold"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Gujarati">Gujarati</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Odia">Odia</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Punjabi">Punjabi</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Assamese">Assamese</option>
                  </select>
                </div>

                {classFilteredSubjects.length === 0 ? (
                  <p className="text-xs font-bold text-slate-500 py-6 text-center">No subjects mapped for Class {formValues.studentClass}.</p>
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
                              ? "border-blue-500 bg-blue-50/50"
                              : "border-slate-200 bg-white hover:bg-slate-50/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-extrabold text-slate-900">{sub.name}</span>
                          </div>
                          
                          <div className={cn(
                            "h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200",
                            isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 text-transparent"
                          )}>
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {totalSubjectsCount > 0 && (
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-150 text-xs font-bold text-slate-605 flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between">
                    <span>Subjects Selected ({totalSubjectsCount}):</span>
                    <span className="text-slate-800">{formValues.selectedSubjects.map(id => subjectsList.find(s => s.id === id)?.name).join(", ")}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-150 pt-2 mt-1">
                    <span>Total Facilitation Fee:</span>
                    <span className="text-slate-955">₹{subtotalBeforeDiscounts}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 5: Documents Hub */}
          {currentStep === 5 && !passportPhoto && !studyProof && (
            <div className="hidden">Mock alignment block</div>
          )}

          {/* STEP 5: Documents Upload */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-black text-slate-900">Documents Upload verification</h3>
                <p className="text-slate-505 mt-0.5">Attach validation files. Size limit: 5MB per file. Formats: PDF, JPG, PNG.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                
                {/* passport photo upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Passport Size Photo *</label>
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 text-center hover:bg-slate-100/50 transition relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
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
                        <span className="text-[10px] text-slate-500 font-semibold mt-1">{(passportPhoto.size / 1024 / 1024).toFixed(2)} MB</span>
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileChange("photo", null);
                          }}
                          className="mt-3 text-red-650 hover:text-red-700 cursor-pointer h-7 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-slate-450 mb-3 animate-pulse" />
                        <span className="text-xs font-extrabold text-blue-600 block">Choose Passport Photo</span>
                        <span className="text-[10px] text-slate-500 font-semibold mt-1">JPG or PNG format</span>
                      </>
                    )}

                    {uploadProgress.photo !== undefined && uploadProgress.photo < 100 && (
                      <div className="absolute bottom-0 left-0 w-full bg-slate-205 h-1">
                        <div className="bg-blue-650 h-1 transition-all duration-100" style={{ width: `${uploadProgress.photo}%` }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* enrollment proof upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">School ID / Study Proof *</label>
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 text-center hover:bg-slate-100/50 transition relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
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
                        <span className="text-xs font-bold text-slate-805 block truncate max-w-full px-4">{studyProof.name}</span>
                        <span className="text-[10px] text-slate-500 font-semibold mt-1">{(studyProof.size / 1024 / 1024).toFixed(2)} MB</span>
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileChange("proof", null);
                          }}
                          className="mt-3 text-red-655 hover:text-red-700 cursor-pointer h-7 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-8 w-8 text-slate-455 mb-3 animate-pulse" />
                        <span className="text-xs font-extrabold text-blue-600 block">Choose School ID / Proof</span>
                        <span className="text-[10px] text-slate-500 font-semibold mt-1">PDF, JPG or PNG format</span>
                      </>
                    )}

                    {uploadProgress.proof !== undefined && uploadProgress.proof < 100 && (
                      <div className="absolute bottom-0 left-0 w-full bg-slate-205 h-1">
                        <div className="bg-blue-650 h-1 transition-all duration-100" style={{ width: `${uploadProgress.proof}%` }} />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 5: Review details */}
          {currentStep === 5 && passportPhoto && studyProof && (
            <motion.div
              key="step-5-review"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-black text-slate-900">Application Review summary</h3>
                <p className="text-slate-505 mt-0.5">Please check all parameters carefully before making checkout payment.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-xs font-bold text-slate-600 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="space-y-2">
                  <h4 className="text-slate-900 border-b border-slate-150 pb-1.5 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-600" /> Student info
                  </h4>
                  <p><span className="text-slate-500 font-semibold">Name:</span> {formValues.studentName}</p>
                  <p><span className="text-slate-500 font-semibold">DOB:</span> {formValues.studentDob}</p>
                  <p><span className="text-slate-500 font-semibold">Gender:</span> {formValues.studentGender}</p>
                  <p><span className="text-slate-500 font-semibold">Father Name:</span> {formValues.fatherName}</p>
                  <p><span className="text-slate-500 font-semibold">Class:</span> Class {formValues.studentClass}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-slate-900 border-b border-slate-150 pb-1.5 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-blue-600" /> School details
                  </h4>
                  <p><span className="text-slate-500 font-semibold">School Name:</span> {formValues.schoolName}</p>
                  <p><span className="text-slate-500 font-semibold">Board:</span> {formValues.schoolBoard}</p>
                  <p><span className="text-slate-500 font-semibold">Address:</span> {formValues.schoolAddress}</p>
                  <p><span className="text-slate-500 font-semibold">Pincode:</span> {formValues.schoolPincode}</p>
                  <p><span className="text-slate-500 font-semibold">City / State:</span> {formValues.schoolCity}, {formValues.schoolState}</p>
                </div>

                <div className="md:col-span-2 space-y-2 mt-2">
                  <h4 className="text-slate-900 border-b border-slate-150 pb-1.5 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-blue-600" /> Subjects & Language Choice
                  </h4>
                  <p className="text-slate-800 text-xs font-black">
                    {formValues.selectedSubjects.map(id => subjectsList.find(s => s.id === id)?.name).join(", ")}
                  </p>
                  <p><span className="text-slate-500 font-semibold">Medium Choice:</span> {formValues.studentMedium}</p>
                </div>

                <div className="md:col-span-2 space-y-2 mt-2">
                  <h4 className="text-slate-900 border-b border-slate-150 pb-1.5 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600" /> Uploaded documents
                  </h4>
                  <div className="flex flex-wrap gap-4 text-[10px]">
                    <p><span className="text-slate-500 font-semibold">Photo:</span> {passportPhoto?.name}</p>
                    <p><span className="text-slate-500 font-semibold">ID Proof:</span> {studyProof?.name}</p>
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
                <h3 className="text-sm font-black text-slate-900">Registration Checkout</h3>
                <p className="text-slate-505 mt-0.5">Apply coupon codes and redeem wallet cashback to complete payment verification.</p>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-2xl border border-slate-205 bg-slate-50 p-5 space-y-3.5 text-xs font-bold text-slate-600">
                <div className="flex justify-between">
                  <span>Standard Registration Fee ({totalSubjectsCount} subject{totalSubjectsCount > 1 ? "s" : ""}):</span>
                  <span className="line-through text-slate-400">₹{basePrice}</span>
                </div>
                
                <div className="flex justify-between text-blue-700 bg-blue-50/50 p-2 rounded-xl border border-blue-150">
                  <span>Facilitator Offer Discount:</span>
                  <span>-₹{basePrice - subtotalBeforeDiscounts}</span>
                </div>

                {appliedCouponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 bg-emerald-50/50 p-2 rounded-xl border border-emerald-150">
                    <span>Coupon Discount Applied ({appliedCouponCode}):</span>
                    <span>-₹{appliedCouponDiscount}</span>
                  </div>
                )}

                {walletUseAmount > 0 && (
                  <div className="flex justify-between text-cyan-700 bg-cyan-50/50 p-2 rounded-xl border border-cyan-150">
                    <span>Wallet Cashback Redeemed (50% cap):</span>
                    <span>-₹{walletUseAmount}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-150 pt-3 text-sm font-black text-slate-900">
                  <span>Net Payable Amount:</span>
                  <span className="text-blue-600">₹{realPayableAmount}</span>
                </div>
              </div>

              {/* Coupon code inputs */}
              {appliedCouponCode ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-250 bg-emerald-50 text-xs font-extrabold text-emerald-750">
                  <span>Coupon {appliedCouponCode} applied! Saved ₹{appliedCouponDiscount}</span>
                  <button type="button" onClick={removeCoupon} className="text-red-650 hover:text-red-700 cursor-pointer">
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
                      className="uppercase bg-white border-slate-200 text-slate-805 rounded-lg text-xs"
                      disabled={couponApplying}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={applyCoupon} 
                      disabled={couponApplying || !couponCode.trim()}
                      className="cursor-pointer border-slate-250 hover:bg-slate-50 text-slate-700 text-xs bg-white"
                    >
                      Apply
                    </Button>
                  </div>
                  {couponError && (
                    <span className="text-[10px] font-bold text-red-650">{couponError}</span>
                  )}
                </div>
              )}

              {/* Wallet adjustment */}
              {wallet.balance > 0 && (
                <div className="p-4 rounded-xl border border-slate-150 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-slate-800 block">Redeem DigiWallet Balance</span>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}

              {/* Final Submit action checks */}
              <div className="mt-6">
                {realPayableAmount === 0 ? (
                  <Button
                    type="button"
                    onClick={handleZeroPaymentCheckout}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-650 text-sm font-extrabold text-white shadow-lg shadow-blue-500/15 cursor-pointer"
                  >
                    Complete Wallet Checkout
                  </Button>
                ) : razorpayPayment ? (
                  <Button
                    type="button"
                    onClick={() => handleSubmitApplication(razorpayPayment)}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-655 text-sm font-extrabold text-white shadow-lg shadow-blue-500/15 cursor-pointer"
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
                        city: formValues.studentCity,
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
      <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-4">
        {currentStep > 1 && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={handlePrevStep}
            className="flex items-center gap-2 rounded-xl cursor-pointer border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
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
            className="flex items-center gap-2 rounded-xl cursor-pointer bg-blue-600 hover:bg-blue-500 text-white"
          >
            <span>Next Step</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Safety Notice */}
      <div className="mt-6 rounded-2xl border border-slate-150 bg-slate-50 p-4 text-[10px] leading-relaxed text-slate-550 flex items-start gap-3">
        <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Payment checkouts are secure by Razorpay with 256-bit encryption. All uploads are locked inside secure Supabase buckets. DigiConnect Dukan coordinators audit applications to prevent incorrect school board codes or duplicate entry rejections.
        </span>
      </div>
    </Card>
  );
}
