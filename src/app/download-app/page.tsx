import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download, QrCode, ShieldCheck, Smartphone } from "lucide-react";

import { existsSync } from "node:fs";
import path from "node:path";

import { MarketingFooter } from "@/components/marketing-footer";

const APK_PATH = "/download/digiconnect-dukan.apk";
const apkUrl = `https://rnos.in${APK_PATH}`;

/**
 * Whether the signed APK has actually been placed in `public/download/`.
 *
 * It has not been, and the page shipped a Download button that 404s. A button
 * that does nothing is worse than an absent one: the reader assumes the phone
 * failed, tries again, and gives up on the app rather than on the link.
 *
 * Checked once at module load — the answer only changes at deploy.
 */
const apkReady = existsSync(path.join(process.cwd(), "public", APK_PATH));

export const metadata: Metadata = {
  title: "Download DigiConnect Dukan Android App",
  description: "Download the DigiConnect Dukan Android APK for Android phones.",
  alternates: {
    canonical: "/download-app",
  },
};

export default function DownloadAppPage() {
  return (
    <>
      <main className="bg-white">
        <section className="px-4 py-10 md:px-8 md:py-16">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div className="rounded-[1.5rem] border border-blue-100 bg-[linear-gradient(135deg,#ffffff,#eef6ff)] p-6 text-center shadow-soft">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[1.35rem] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                <Image src="/icons/icon-192.png" alt="DigiConnect Dukan app icon" width={96} height={96} className="h-24 w-24 rounded-[1.1rem]" priority />
              </div>
              <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.14em] text-blue-700">Android App</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-4xl">DigiConnect Dukan</h1>
              <p className="mt-3 text-sm font-semibold text-slate-600">For Android phones only</p>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
                <Smartphone className="h-4 w-4" />
                Direct APK Download
              </div>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 md:text-5xl">Install DigiConnect Dukan on your phone</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Download the Android APK, open it on your phone, and allow installation when Android asks for permission. The app opens the secure DigiConnect Dukan website at rnos.in.
              </p>

              <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">1</span>
                  Tap the download button below.
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">2</span>
                  Open the downloaded APK file on your Android phone.
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">3</span>
                  If prompted, allow install from your browser, then tap Install.
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {apkReady ? (
                  <a
                    href={APK_PATH}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0B1F3A] px-6 text-sm font-extrabold text-white shadow-md shadow-blue-950/15"
                  >
                    <Download className="h-4 w-4" />
                    Download APK
                  </a>
                ) : (
                  <p className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900">
                    <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                    App abhi taiyar ho rahi hai — tab tak website phone par waise hi chalti hai.
                  </p>
                )}
                <Link href="/services" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-blue-100 bg-white px-6 text-sm font-extrabold text-blue-800">
                  View Services
                </Link>
              </div>

              {/* The QR link is only useful once the file behind it exists. */}
              {apkReady ? (
                <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                    <div>
                      <p className="text-sm font-extrabold text-slate-950">QR-ready link</p>
                      <p className="mt-1 break-all text-sm font-semibold text-blue-800">{apkUrl}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm font-semibold leading-6 text-emerald-900">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                The app uses HTTPS only and does not store customer, admin, wallet, or dashboard data locally.
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
