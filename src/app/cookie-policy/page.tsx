import type { Metadata } from "next";

import { LegalLink, LegalPage } from "@/components/legal/legal-page";
import { CookieSettingsButton } from "@/components/privacy/cookie-consent";
import { business, cookieCategories } from "@/lib/compliance/config";

export const metadata: Metadata = {
  title: "Cookie Policy | DigiConnect Dukan",
  description: "The cookies and similar technologies DigiConnect Dukan uses, why, and how to change your choices.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      eyebrow="Policy"
      title="Cookie Policy"
      currentHref="/cookie-policy"
      intro={
        <>
          <p>
            Cookies are small files a website stores in your browser. {business.brand} also uses similar browser
            storage (such as session storage). This page lists what we use and why. It should be read with our{" "}
            <LegalLink href="/privacy-policy">Privacy Policy</LegalLink>.
          </p>
          <p>
            <strong>Your choice matters:</strong> analytics and marketing tools are not loaded until you allow them.
            You can accept all, reject non-essential cookies, or choose category by category — and change your mind
            at any time: <CookieSettingsButton className="font-semibold text-blue-800 underline underline-offset-2" />.
          </p>
        </>
      }
      sections={[
        ...cookieCategories.map((category) => ({
          id: `category-${category.id}`,
          title: category.label,
          body: (
            <>
              <p>
                {category.description}{" "}
                {category.required ? <strong>Always on.</strong> : <strong>Off unless you allow it.</strong>}
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <caption className="sr-only">{category.label} cookies and storage</caption>
                  <thead className="bg-slate-50 text-slate-900">
                    <tr>
                      <th scope="col" className="p-3 font-bold">Name</th>
                      <th scope="col" className="p-3 font-bold">Provider</th>
                      <th scope="col" className="p-3 font-bold">Purpose</th>
                      <th scope="col" className="p-3 font-bold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.items.map((item) => (
                      <tr key={item.name} className="border-t border-slate-200 align-top">
                        <th scope="row" className="p-3 font-semibold text-slate-900">{item.name}</th>
                        <td className="p-3">{item.provider}</td>
                        <td className="p-3">{item.purpose}</td>
                        <td className="p-3">{item.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ),
        })),
        {
          id: "embedded-content",
          title: "Embedded videos",
          body: (
            <p>
              Some pages show videos from YouTube. We use YouTube&rsquo;s privacy-enhanced mode
              (youtube-nocookie.com), which does not set YouTube cookies until you play a video. When you play a
              video, YouTube (Google) may set its own cookies under Google&rsquo;s privacy policy.
            </p>
          ),
        },
        {
          id: "manage",
          title: "Managing cookies",
          body: (
            <>
              <p>
                Use <CookieSettingsButton className="font-semibold text-blue-800 underline underline-offset-2" /> (also in
                every page footer) to change your choice. When you withdraw consent we stop loading the tool and delete
                the cookies it set on our domain. Your choice is remembered for about six months, after which we ask
                again.
              </p>
              <p>
                You can also block or delete cookies in your browser settings. Blocking strictly necessary cookies will
                stop sign-in and payments from working.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
