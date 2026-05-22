import { getActiveHomepageOfferBanners, getHomepageOfferStripSetting } from "@/lib/homepage-offer-banners";
import { HomepageOfferStripClient } from "@/components/homepage-offer-strip-client";

export async function HomepageOfferStrip() {
  const [setting, banners] = await Promise.all([getHomepageOfferStripSetting(), getActiveHomepageOfferBanners()]);

  return <HomepageOfferStripClient title={setting.title} banners={banners} />;
}
