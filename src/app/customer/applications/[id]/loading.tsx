import { DigiConnectLoader } from "@/components/ui/digiconnect-loader";

export default function CustomerApplicationDetailLoading() {
  return (
    <DigiConnectLoader
      variant="section"
      size="md"
      label="Loading application..."
      showLabel
    />
  );
}
