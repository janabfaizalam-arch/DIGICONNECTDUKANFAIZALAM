import { DigiConnectLoader } from "@/components/ui/digiconnect-loader";

export default function Loading() {
  return (
    <DigiConnectLoader
      variant="fullscreen"
      size="lg"
      label="Loading DigiConnect Dukan..."
      showLabel
    />
  );
}
