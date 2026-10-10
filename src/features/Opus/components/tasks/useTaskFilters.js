import { useEffect, useReducer, useRef } from "react";
import { filtersFromParams, filtersReducer } from "./filterTasks.js";

/**
 * Filter state for the Tasks tab, seeded from the navigation payload
 * ({ status, ws, milestone }). `params` is replaced on every navigate(), so a
 * tab that is already mounted re-applies it when another panel links here.
 */
export const useTaskFilters = (params) => {
  const [filters, dispatch] = useReducer(filtersReducer, params, (seed) => filtersFromParams(seed));
  const applied = useRef(params);

  useEffect(() => {
    if (applied.current === params) return;
    applied.current = params;
    dispatch({ type: "params", params });
  }, [params]);

  return [filters, dispatch];
};
