import { useEffect, useState } from "react";
import { subscribe } from "@/lib/theme.js";
import { clusterColors, graphTheme } from "@/lib/tokens";

const read = () => ({ theme: graphTheme(), colors: clusterColors() });

/**
 * Canvas palette that follows the theme. Lazy initial read (computed styles
 * need the stylesheet applied) and a fresh object per theme change so effects
 * can key off it without touching node data or the simulation.
 */
export function useThemeTokens() {
  const [tokens, setTokens] = useState(read);
  // tokens.js clears its cache on the same event, and subscribed first.
  useEffect(() => subscribe(() => setTokens(read())), []);
  return tokens;
}
