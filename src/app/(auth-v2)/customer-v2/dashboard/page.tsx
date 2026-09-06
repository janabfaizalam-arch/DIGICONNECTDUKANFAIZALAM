"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowRight, FileText, PlusCircle, CreditCard, Clock } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  customer: {
    name: string;
    wallet_balance: number;
    mobile: string;
  };
  recentApplications: Array<{
    id: string;
    service_name: string;
    status: string;
    created_at: string;
  }>;
}

export default function CustomerV2Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/customer-auth/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-white/5 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-white/5 animate-pulse rounded-3xl" />
          <div className="h-40 md:col-span-2 bg-white/5 animate-pulse rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, {data?.customer.name.split(' ')[0]}</h1>
          <p className="text-white/50 mt-1">Here is what&apos;s happening with your account today.</p>
        </div>
        <Link href="/services" className="bg-[#00bfa5] hover:bg-[#00a68f] text-white px-6 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(0,191,165,0.2)]">
          <PlusCircle className="w-4 h-4" /> Start New Service
        </Link>
      </motion.div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Card */}
        <motion.div variants={itemVariants} className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00bfa5]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-3 text-white/70 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#00bfa5]/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#00bfa5]" />
              </div>
              <span className="font-medium">Wallet Balance</span>
            </div>
            <div>
              <span className="text-4xl font-bold text-white">₹{(data?.customer.wallet_balance || 0).toFixed(2)}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex gap-4">
              <button className="text-xs font-semibold text-[#00bfa5] hover:text-white transition-colors flex items-center gap-1">
                Add Funds <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions / Summary Card */}
        <motion.div variants={itemVariants} className="md:col-span-2 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl flex flex-col justify-center">
           <h3 className="text-lg font-semibold text-white mb-6">Quick Overview</h3>
           <div className="grid grid-cols-3 gap-4">
             <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
               <FileText className="w-6 h-6 text-blue-400 mb-2" />
               <div className="text-2xl font-bold text-white">{data?.recentApplications.length || 0}</div>
               <div className="text-xs text-white/50">Total Applications</div>
             </div>
             <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
               <Clock className="w-6 h-6 text-yellow-400 mb-2" />
               <div className="text-2xl font-bold text-white">
                 {data?.recentApplications.filter(a => a.status === 'pending').length || 0}
               </div>
               <div className="text-xs text-white/50">Pending</div>
             </div>
             <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
               <CreditCard className="w-6 h-6 text-green-400 mb-2" />
               <div className="text-2xl font-bold text-white">0</div>
               <div className="text-xs text-white/50">Recent Transactions</div>
             </div>
           </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Recent Applications</h3>
          {/* /customer-v2/applications was never built — this pointed at a 404.
              The customer portal's Applications section is the real list. */}
          <Link href="/dashboard" className="text-sm font-medium text-[#00bfa5] transition-colors hover:text-white">View All</Link>
        </div>
        <div className="p-0">
          {(!data?.recentApplications || data.recentApplications.length === 0) ? (
            <div className="p-8 text-center text-white/50 flex flex-col items-center">
              <FileText className="w-12 h-12 mb-3 opacity-20" />
              <p>No recent applications found.</p>
              <Link href="/services" className="text-[#00bfa5] mt-2 font-medium text-sm">Browse Services</Link>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-sm text-white/40">
                  <th className="font-medium p-6 py-4">Service</th>
                  <th className="font-medium p-6 py-4">Date</th>
                  <th className="font-medium p-6 py-4">Status</th>
                  <th className="font-medium p-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recentApplications.map((app) => (
                  <tr key={app.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-6 py-4 font-medium text-white">{app.service_name}</td>
                    <td className="p-6 py-4 text-sm text-white/60">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="p-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/10">
                        {app.status}
                      </span>
                    </td>
                    <td className="p-6 py-4 text-right">
                      <button className="text-sm font-medium text-[#00bfa5] hover:text-white transition-colors">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
