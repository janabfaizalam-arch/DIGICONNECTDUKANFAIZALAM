import { DigiConnectLoader } from "@/components/ui/digiconnect-loader";

/** Backward-compatible route loader — branded five-square system. */
export function UniversalLoader({
  label = "Loading DigiConnect Dukan...",
  fullPage = true,
}: {
  label?: string;
  fullPage?: boolean;
}) {
  return (
    <DigiConnectLoader
      variant={fullPage ? "fullscreen" : "section"}
      size={fullPage ? "lg" : "md"}
      label={label}
      showLabel
    />
  );
}
