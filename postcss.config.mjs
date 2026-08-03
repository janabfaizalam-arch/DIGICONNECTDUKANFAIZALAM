import { patchTailwindOxideScanner } from "./scripts/patch-tailwind-oxide-scanner.mjs";

// App Control blocks oxide-win32 *.node → empty utility CSS without this patch.
patchTailwindOxideScanner();

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
