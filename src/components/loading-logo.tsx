import Image from "next/image";

type LoadingLogoProps = {
  label?: string;
};

export function LoadingLogo({ label = "Loading DigiConnect Dukan" }: LoadingLogoProps) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4" role="status" aria-live="polite" aria-label={label}>
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo-navbar.png"
          alt="DigiConnect Dukan Logo"
          width={220}
          height={94}
          priority
          className="h-auto w-44 object-contain md:w-56 motion-safe:animate-logo-load"
        />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
