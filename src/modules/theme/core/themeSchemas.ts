import { z } from "zod";

// Extremely strict regex to prevent any CSS injection or XSS payloads.
// Only matches 3, 4, 6, or 8 digit hex colors (e.g. #fff, #ffffff, #ffffff00)
// or strict hsl() syntax without arbitrary calc() injections.
const HexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const HslColorRegex = /^hsl\(\s*(?:360|3[0-5]\d|[12]\d{2}|[1-9]\d?|0)\s*(?:deg)?\s*,\s*(?:100|[1-9]\d?|0)%\s*,\s*(?:100|[1-9]\d?|0)%\s*\)$/i;

const SafeColorSchema = z.string().refine(
  (val) => HexColorRegex.test(val) || HslColorRegex.test(val),
  { message: "Color must be a strict HEX (e.g. #22c55e) or HSL value to prevent CSS Injection." }
);

export const ThemeConfigurationSchema = z.object({
  primaryColor: SafeColorSchema,
  secondaryColor: SafeColorSchema,
  backgroundLight: SafeColorSchema,
  backgroundDark: SafeColorSchema,
  enableDarkMode: z.boolean().default(false),
});

export type ThemeConfigurationDTO = z.infer<typeof ThemeConfigurationSchema>;
