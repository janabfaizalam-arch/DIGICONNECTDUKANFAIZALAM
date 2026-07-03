import { UniversalLoader } from "@/components/ui/universal-loader";

type LoadingLogoProps = {
  label?: string;
};

export function LoadingLogo({ label = "Loading DigiConnect Dukan" }: LoadingLogoProps) {
  return <UniversalLoader label={label} />;
}
