"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calculator,
  ArrowLeft,
  Sparkles,
  Award,
  Percent,
  DollarSign,
  Info
} from "lucide-react";

type CalculatorTab = "regime" | "hra" | "deductions" | "refund";

export default function ItrCalculatorsPage() {
  const [activeTab, setActiveTab] = useState<CalculatorTab>("regime");

  // Regime Calculator inputs
  const [salary, setSalary] = useState<number>(800000);
  const [otherIncome, setOtherIncome] = useState<number>(30000);
  const [ded80C, setDed80C] = useState<number>(150000);
  const [ded80D, setDed80D] = useState<number>(25000);
  const [hraExempt, setHraExempt] = useState<number>(50000);
  const [homeLoanInt, setHomeLoanInt] = useState<number>(0);

  // HRA Calculator inputs
  const [basicSalary, setBasicSalary] = useState<number>(40000);
  const [hraReceived, setHraReceived] = useState<number>(15000);
  const [rentPaid, setRentPaid] = useState<number>(12000);
  const [isMetro, setIsMetro] = useState<boolean>(true);

  // Deductions Advisor inputs (sliders)
  const [licPpf, setLicPpf] = useState<number>(100000);
  const [elssNps, setElssNps] = useState<number>(20000);
  const [healthIns, setHealthIns] = useState<number>(15000);
  const [eduLoanInt, setEduLoanInt] = useState<number>(0);

  // Refund Estimator inputs
  const [estimatedTax, setEstimatedTax] = useState<number>(45000);
  const [totalTds, setTotalTds] = useState<number>(60000);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Regime computations AY 2026-27 (FY 2025-26)
  const regimeResults = useMemo(() => {
    const totalGross = salary + otherIncome;

    // --- NEW REGIME ---
    // Standard deduction for New regime is ₹75,000 for FY 2025-26
    const netNewIncome = Math.max(0, totalGross - 75000);
    let newTax = 0;
    
    // Slabs:
    // Up to 3,000,000: Nil
    // 300,000 to 700,000: 5%
    // 700,000 to 1,000,000: 10%
    // 1,000,000 to 1,200,000: 15%
    // 1,200,000 to 1,500,000: 20%
    // Above 1,500,000: 30%
    if (netNewIncome > 1500000) {
      newTax += (netNewIncome - 1500000) * 0.3 + 300000 * 0.2 + 200000 * 0.15 + 300000 * 0.1 + 400000 * 0.05;
    } else if (netNewIncome > 1200000) {
      newTax += (netNewIncome - 1200000) * 0.2 + 200000 * 0.15 + 300000 * 0.1 + 400000 * 0.05;
    } else if (netNewIncome > 1000000) {
      newTax += (netNewIncome - 1000000) * 0.15 + 300000 * 0.1 + 400000 * 0.05;
    } else if (netNewIncome > 700000) {
      newTax += (netNewIncome - 700000) * 0.1 + 400000 * 0.05;
    } else if (netNewIncome > 300000) {
      newTax += (netNewIncome - 300000) * 0.05;
    }
    
    // Rebate Section 87A: tax free up to ₹7 Lakhs net taxable income (meaning tax is zero if income <= 7.75 Lakhs with standard deduction)
    if (netNewIncome <= 700000) {
      newTax = 0;
    }
    // Cess 4%
    const finalNewTax = newTax * 1.04;

    // --- OLD REGIME ---
    // Standard deduction for Old regime is ₹50,000
    const totalDeductions = Math.min(150000, ded80C) + Math.min(50000, ded80D) + hraExempt + Math.min(200000, homeLoanInt);
    const netOldIncome = Math.max(0, totalGross - 50000 - totalDeductions);
    let oldTax = 0;

    // Slabs:
    // Up to 250,000: Nil
    // 250,000 to 500,000: 5%
    // 500,000 to 1,000,000: 20%
    // Above 1,000,000: 30%
    if (netOldIncome > 1000000) {
      oldTax += (netOldIncome - 1000000) * 0.3 + 500000 * 0.2 + 250000 * 0.05;
    } else if (netOldIncome > 500000) {
      oldTax += (netOldIncome - 500000) * 0.2 + 250000 * 0.05;
    } else if (netOldIncome > 250000) {
      oldTax += (netOldIncome - 250000) * 0.05;
    }

    // Rebate Section 87A: tax free up to ₹5 Lakhs net taxable income under old regime
    if (netOldIncome <= 500000) {
      oldTax = 0;
    }
    const finalOldTax = oldTax * 1.04;

    const diff = Math.abs(finalOldTax - finalNewTax);
    const cheaper = finalNewTax < finalOldTax ? "New Tax Regime" : "Old Tax Regime";

    return {
      gross: totalGross,
      newTaxable: netNewIncome,
      newTax: finalNewTax,
      oldTaxable: netOldIncome,
      oldTax: finalOldTax,
      difference: diff,
      cheaperRegime: cheaper
    };
  }, [salary, otherIncome, ded80C, ded80D, hraExempt, homeLoanInt]);

  // HRA computations (monthly to annual)
  const hraResults = useMemo(() => {
    const annualBasic = basicSalary * 12;
    const annualReceived = hraReceived * 12;
    const annualRent = rentPaid * 12;

    const metric1 = annualReceived;
    const metric2 = Math.max(0, annualRent - (annualBasic * 0.10));
    const metric3 = isMetro ? (annualBasic * 0.50) : (annualBasic * 0.40);

    const exempt = Math.min(metric1, metric2, metric3);
    const taxable = Math.max(0, annualReceived - exempt);

    return {
      exemption: exempt,
      taxableHra: taxable,
      basicCap: metric3,
      rentMinusTen: metric2
    };
  }, [basicSalary, hraReceived, rentPaid, isMetro]);

  // Deductions savings estimate
  const deductionsResults = useMemo(() => {
    const totalDeducted = Math.min(150000, licPpf) + Math.min(50000, elssNps) + Math.min(50000, healthIns) + eduLoanInt;
    // Assuming typical 20% slab savings
    const estimatedSavings = totalDeducted * 0.208;
    return {
      total: totalDeducted,
      savings: estimatedSavings
    };
  }, [licPpf, elssNps, healthIns, eduLoanInt]);

  return (
    <main className="min-h-screen bg-[#fbfcff] text-[#0b1f3a] relative overflow-hidden pb-20">
      
      {/* Dynamic Background decor */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(circle_at_15%_15%,rgba(249,115,22,0.06),transparent_50%),radial-gradient(circle_at_85%_35%,rgba(99,102,241,0.05),transparent_50%)] pointer-events-none" />

      {/* TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-20 w-full px-4 md:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/services/itr-filing"
            className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Calculator className="h-4 w-4 text-orange-655" />
              Tax Calculators Hub
            </h1>
            <p className="text-[10px] text-slate-450 font-bold mt-0.5">Assisted computations AY 2026-27</p>
          </div>
        </div>

        <Link
          href="/apply/itr-filing"
          className="h-9 px-4.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-600 text-xs font-black text-white hover:shadow-md hover:shadow-orange-500/15 transition active:scale-95"
        >
          File Assisted ITR
        </Link>
      </header>

      {/* MAIN CONTAINER */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-12 space-y-10">
        
        {/* Page Titles */}
        <div className="text-center space-y-2">
          <span className="inline-flex rounded-full bg-orange-50 px-3 py-0.5 text-[10px] font-black text-orange-755 border border-orange-100 uppercase tracking-widest">
            Compute Slabs
          </span>
          <h2 className="text-2xl md:text-3.5xl font-black text-[#071326] tracking-tight">
            Calculate Your Taxes & Savings
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-500 max-w-lg mx-auto">
            Dynamic client-side calculators to estimate exemptions, verify old vs new slab structures and target net refunds.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center border-b border-slate-100 pb-px">
          <div className="flex gap-2">
            {[
              { id: "regime", label: "Old vs New Slabs", icon: Sparkles },
              { id: "hra", label: "HRA Exemption", icon: Percent },
              { id: "deductions", label: "Deductions Advisor", icon: Award },
              { id: "refund", label: "Refund Estimator", icon: DollarSign }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as CalculatorTab)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-black transition cursor-pointer border ${
                    isActive
                      ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div className="bg-white border border-slate-100 rounded-[36px] p-6 md:p-8 shadow-xl">
          
          {/* TAB 1: OLD VS NEW REGIME */}
          {activeTab === "regime" && (
            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              
              {/* Inputs */}
              <div className="space-y-5">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">Salary & Deductions Details</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Annual Gross Salary Income</label>
                    <input
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(Number(e.target.value))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Other Incomes (Interest, Rent, etc.)</label>
                    <input
                      type="number"
                      value={otherIncome}
                      onChange={(e) => setOtherIncome(Number(e.target.value))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Sec 80C Investment (PPF, EPF, LIC)</label>
                    <input
                      type="number"
                      max={150000}
                      value={ded80C}
                      onChange={(e) => setDed80C(Math.min(150000, Number(e.target.value)))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Sec 80D Premium (Health Ins.)</label>
                    <input
                      type="number"
                      max={50000}
                      value={ded80D}
                      onChange={(e) => setDed80D(Math.min(50000, Number(e.target.value)))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Annual HRA Exemption Claim</label>
                    <input
                      type="number"
                      value={hraExempt}
                      onChange={(e) => setHraExempt(Number(e.target.value))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Home Loan Interest (Sec 24b)</label>
                    <input
                      type="number"
                      max={200000}
                      value={homeLoanInt}
                      onChange={(e) => setHomeLoanInt(Math.min(200000, Number(e.target.value)))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50/20 border border-orange-100/50 flex gap-3 text-xs text-slate-550 leading-relaxed font-semibold">
                  <Info className="h-4.5 w-4.5 text-orange-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>FY 2025-26 slabs:</strong> New Regime standard deduction is ₹75,000, while Old Regime standard deduction is ₹50,000. Under Old Regime, you can apply standard 80C and Section 24b deductions.
                  </p>
                </div>
              </div>

              {/* Outputs Summary Column */}
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase">
                    Tax Advice
                  </span>
                  <h3 className="text-base font-black text-[#071326] mt-2">Preferred Regime:</h3>
                  <p className="text-xl font-black text-blue-700 mt-0.5">{regimeResults.cheaperRegime}</p>
                  
                  {regimeResults.difference > 0 && (
                    <p className="text-xs font-bold text-emerald-600 mt-1">
                      Saves {formatCurrency(regimeResults.difference)} in tax liabilities annually!
                    </p>
                  )}
                </div>

                <div className="space-y-3 border-t border-b border-slate-200/50 py-4 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>New Regime Tax</span>
                    <span className="font-black text-slate-800">{formatCurrency(regimeResults.newTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Old Regime Tax</span>
                    <span className="font-black text-slate-800">{formatCurrency(regimeResults.oldTax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-xs">
                    <span>Total Tax Savings</span>
                    <span className="text-emerald-650">{formatCurrency(regimeResults.difference)}</span>
                  </div>
                </div>

                <Link
                  href="/apply/itr-filing"
                  className="w-full h-10 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow"
                >
                  File Assisted ITR Now
                </Link>
              </div>

            </div>
          )}

          {/* TAB 2: HRA EXEMPTION */}
          {activeTab === "hra" && (
            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              
              {/* Inputs */}
              <div className="space-y-5">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">HRA Parameters</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Monthly Basic Salary</label>
                    <input
                      type="number"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(Number(e.target.value))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Monthly HRA Received</label>
                    <input
                      type="number"
                      value={hraReceived}
                      onChange={(e) => setHraReceived(Number(e.target.value))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Monthly Rent Paid</label>
                    <input
                      type="number"
                      value={rentPaid}
                      onChange={(e) => setRentPaid(Number(e.target.value))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div className="flex items-center gap-3.5 pt-4">
                    <label className="text-xs font-black text-slate-600">Living in Metro City?</label>
                    <input
                      type="checkbox"
                      checked={isMetro}
                      onChange={(e) => setIsMetro(e.target.checked)}
                      className="h-5 w-5 rounded text-orange-500 focus:ring-orange-500 shrink-0"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50/20 border border-orange-100/50 flex gap-3 text-xs text-slate-550 leading-relaxed font-semibold">
                  <Info className="h-4.5 w-4.5 text-orange-600 shrink-0 mt-0.5" />
                  <p>
                    HRA exemptions under Sec 10(13A) is computed based on minimum of: Actual HRA received, Rent Paid minus 10% of Basic, or 50% basic (metro) / 40% (non-metro).
                  </p>
                </div>
              </div>

              {/* HRA Results */}
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-black text-orange-700 uppercase">
                    Exemption Calculated
                  </span>
                  <h3 className="text-base font-black text-[#071326] mt-2">Annual Exempted HRA:</h3>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">{formatCurrency(hraResults.exemption)}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Taxable HRA: {formatCurrency(hraResults.taxableHra)}</p>
                </div>

                <div className="space-y-2.5 border-t border-slate-200/50 pt-4 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Annual Basic salary</span>
                    <span className="font-black text-slate-800">{formatCurrency(basicSalary * 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rent Paid (Annual)</span>
                    <span className="font-black text-slate-800">{formatCurrency(rentPaid * 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>10% Basic Salary Cap</span>
                    <span className="font-black text-slate-800">{formatCurrency(basicSalary * 12 * 0.1)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setHraExempt(hraResults.exemption);
                    setActiveTab("regime");
                  }}
                  className="w-full h-10 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow"
                >
                  Apply to Slabs Advisor
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: DEDUCTIONS ADVISOR */}
          {activeTab === "deductions" && (
            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              
              {/* Inputs */}
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">Drag to Customize Investments</h3>
                
                <div className="space-y-4">
                  {/* Slider 1 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>LIC Premium, PPF, EPF (Sec 80C)</span>
                      <span className="font-black">{formatCurrency(licPpf)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={150000}
                      step={5000}
                      value={licPpf}
                      onChange={(e) => setLicPpf(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Slider 2 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>NPS, Tax-saving mutual funds (80CCD)</span>
                      <span className="font-black">{formatCurrency(elssNps)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50000}
                      step={5000}
                      value={elssNps}
                      onChange={(e) => setElssNps(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Slider 3 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Health Insurance Premiums (Sec 80D)</span>
                      <span className="font-black">{formatCurrency(healthIns)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50000}
                      step={2500}
                      value={healthIns}
                      onChange={(e) => setHealthIns(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Slider 4 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Education Loan Interest (Sec 80E)</span>
                      <span className="font-black">{formatCurrency(eduLoanInt)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200000}
                      step={10000}
                      value={eduLoanInt}
                      onChange={(e) => setEduLoanInt(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions Advisor Results */}
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700 uppercase">
                    Tax Savings Advisor
                  </span>
                  <h3 className="text-base font-black text-[#071326] mt-2">Estimated Tax Saved:</h3>
                  <p className="text-xl font-black text-emerald-650 mt-0.5">{formatCurrency(deductionsResults.savings)}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Total deductions applied: {formatCurrency(deductionsResults.total)}</p>
                </div>

                <div className="p-4 bg-white border border-slate-150/40 rounded-2xl text-[10px] text-slate-550 leading-relaxed font-semibold">
                  This estimates savings assuming you fall in the 20% slab under the Old Regime. Actual savings may vary according to taxable brackets.
                </div>

                <button
                  onClick={() => {
                    setDed80C(licPpf);
                    setDed80D(healthIns);
                    setOtherIncome(eduLoanInt);
                    setActiveTab("regime");
                  }}
                  className="w-full h-10 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow"
                >
                  Apply to Slabs Advisor
                </button>
              </div>

            </div>
          )}

          {/* TAB 4: REFUND ESTIMATOR */}
          {activeTab === "refund" && (
            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              
              {/* Inputs */}
              <div className="space-y-5">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">TDS Credits</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Estimated Annual Tax Liability</label>
                    <input
                      type="number"
                      value={estimatedTax}
                      onChange={(e) => setEstimatedTax(Number(e.target.value))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Total Tax Deducted (TDS/TCS as per 26AS)</label>
                    <input
                      type="number"
                      value={totalTds}
                      onChange={(e) => setTotalTds(Number(e.target.value))}
                      className="mt-1 block w-full rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#071326] outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50/20 border border-orange-100/50 flex gap-3 text-xs text-slate-550 leading-relaxed font-semibold">
                  <Info className="h-4.5 w-4.5 text-orange-600 shrink-0 mt-0.5" />
                  <p>
                    Verify matching TDS records in Form 26AS. If TDS exceeds your computed tax liability, you are entitled to claim a full refund of the difference when filing your ITR.
                  </p>
                </div>
              </div>

              {/* Refund Estimator Results */}
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase">
                    Refund Estimate
                  </span>
                  <h3 className="text-base font-black text-[#071326] mt-2">
                    {totalTds >= estimatedTax ? "Eligible Tax Refund:" : "Outstanding Tax Due:"}
                  </h3>
                  <p className={`text-xl font-black mt-0.5 ${totalTds >= estimatedTax ? "text-emerald-600" : "text-orange-655"}`}>
                    {formatCurrency(Math.abs(totalTds - estimatedTax))}
                  </p>
                </div>

                <div className="space-y-2.5 border-t border-slate-200/50 pt-4 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Tax Liability</span>
                    <span className="font-black text-slate-800">{formatCurrency(estimatedTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TDS Deducted (Form 26AS)</span>
                    <span className="font-black text-slate-800">{formatCurrency(totalTds)}</span>
                  </div>
                </div>

                <Link
                  href="/apply/itr-filing"
                  className="w-full h-10 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow"
                >
                  File Return & Claim Refund
                </Link>
              </div>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}
