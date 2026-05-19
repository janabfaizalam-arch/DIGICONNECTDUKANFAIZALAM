import { redirect } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { buildAgentWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function AgentSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login/agent");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");
  const whatsappUrl = buildWhatsAppUrl(
    buildAgentWhatsAppMessage({
      agentName: user.user_metadata.full_name ?? user.user_metadata.name ?? user.email,
      topic: "Agent support for customer, document, payment, or commission help",
    }),
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Support</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">Agent Support</h1>
        </div>
        <Card className="rounded-2xl p-5">
          <p className="text-sm leading-6 text-slate-600">Contact DigiConnect Dukan admin support for customer, document, payment, or commission help.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a href="tel:7007595931" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white">
              <Phone className="h-4 w-4" />
              Call Support
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}
