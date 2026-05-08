import { SiteHeader } from "@/components/marketing/SiteHeader";
import { HeroSection } from "@/components/marketing/HeroSection";
import { UseCases } from "@/components/marketing/UseCases";
import { Features } from "@/components/marketing/Features";
import { DemoSection } from "@/components/marketing/DemoSection";
import { HelpStrip } from "@/components/marketing/HelpStrip";
import { Pricing } from "@/components/marketing/Pricing";
import { FAQ } from "@/components/marketing/FAQ";
import { CtaStrip } from "@/components/marketing/CtaStrip";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <UseCases />
        <Features />
        <DemoSection />
        <HelpStrip />
        <Pricing />
        <FAQ />
        <CtaStrip />
      </main>
      <SiteFooter />
    </div>
  );
}
