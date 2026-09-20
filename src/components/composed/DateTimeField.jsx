import * as React from "react";
import { cn } from "@/lib/utils";
import { toLocalInputValue } from "@/lib/time";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Date + time picker.
 *
 * Keeps DateTimePicker's calendar grid and hour/minute lists — that logic was
 * fine — but drops its `useLayoutEffect` + manual top/left/flip math in favour
 * of Base UI's Popover, which already handles collision and flipping. This
 * was the third component (after CustomSelect and PillSelect) duplicating
 * that same positioning code.
 */
function DateTimeField({ label, labelClassName, value, onChange, dateOnly = false }) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState("date");

  const dateObj = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = React.useState(new Date(dateObj));

  React.useEffect(() => {
    if (open) setViewDate(new Date(value ? new Date(value) : new Date()));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const hours24 = dateObj.getHours();
  const isPm = hours24 >= 12;
  const hours12 = hours24 % 12 || 12;
  const minutes = dateObj.getMinutes();

  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const startPad = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const gridCells = [];
  for (let i = 0; i < startPad; i++) gridCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) gridCells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));

  const setDatePart = (d) => {
    const newDate = new Date(dateObj);
    newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    onChange(toLocalInputValue(newDate));
    if (!dateOnly) setTab("time");
    else setOpen(false);
  };

  const setTimePart = (field, val) => {
    let newH = hours24;
    let newM = minutes;
    if (field === "hour") {
      const isP = newH >= 12;
      newH = val === 12 ? (isP ? 12 : 0) : isP ? val + 12 : val;
    } else if (field === "min") {
      newM = val;
    } else if (field === "ampm") {
      if (val === "AM" && newH >= 12) newH -= 12;
      if (val === "PM" && newH < 12) newH += 12;
    }
    const newDate = new Date(dateObj);
    newDate.setHours(newH, newM);
    onChange(toLocalInputValue(newDate));
  };

  const formatDisplay = (d) => {
    if (!d) return dateOnly ? "Select date…" : "Select time…";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "Invalid date";
    const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
    if (dateOnly) return dateStr;
    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    return `${dateStr}, ${timeStr}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <Label className={labelClassName}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={label ? `${label}: select date and time` : "Select date and time"}
              className="flex h-11 w-full items-center gap-3 rounded-3xl border border-border bg-transparent px-3 text-left text-sm text-foreground outline-none transition-colors focus-visible:border-ring"
            >
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{formatDisplay(value)}</span>
            </button>
          }
        />
        {/* Matches the field's width rather than a fixed 288px. The calendar
            grid is capped and centred instead of stretching, so a wide field
            doesn't produce enormous day cells and a narrow one still fits. */}
        <PopoverContent align="start" className="w-(--anchor-width) min-w-[184px] p-2">
          {!dateOnly && (
            <Tabs value={tab} onValueChange={setTab} className="mb-2">
              {/* The shared TabsList is h-11 to match form fields; inside the
                  popup that's oversized chrome, so it's compact here. */}
              <TabsList className="w-full group-data-horizontal/tabs:h-8">
                <TabsTrigger value="date" className="flex-1">Date</TabsTrigger>
                <TabsTrigger value="time" className="flex-1">Time</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {tab === "date" && (
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span>{viewDate.toLocaleString("default", { month: "long", year: "numeric" })}</span>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="text-xs font-bold uppercase text-subtle-foreground">{d}</div>
                ))}
                {gridCells.map((d, i) => (
                  <div key={i} className="h-7">
                    {d && (
                      <button
                        type="button"
                        onClick={() => setDatePart(d)}
                        className={cn(
                          "flex h-full w-full items-center justify-center rounded-md text-xs transition-all hover:bg-accent",
                          d.toDateString() === dateObj.toDateString()
                            ? "bg-primary font-bold text-primary-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {d.getDate()}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "time" && !dateOnly && (
            <div className="flex w-full flex-col gap-2">
              <div className="grid h-40 grid-cols-2 overflow-hidden pb-1">
                <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar border-r border-border-subtle px-3">
                  <div className="sticky top-0 z-10 bg-popover py-1 text-center text-xs font-bold uppercase text-subtle-foreground">Hour</div>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTimePart("hour", h)}
                      className={cn(
                        "shrink-0 rounded-md py-1 text-xs transition-colors hover:bg-accent",
                        h === hours12 ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar px-3">
                  <div className="sticky top-0 z-10 bg-popover py-1 text-center text-xs font-bold uppercase text-subtle-foreground">Min</div>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTimePart("min", m)}
                      className={cn(
                        "shrink-0 rounded-md py-1 text-xs transition-colors hover:bg-accent",
                        m === minutes ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {m.toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="grid w-fit grid-cols-2 gap-1 rounded-full border border-border bg-transparent p-0.5">
                  <button
                    type="button"
                    onClick={() => setTimePart("ampm", "AM")}
                    className={cn("rounded-full px-4 py-1 text-xs font-bold transition-all", !isPm ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePart("ampm", "PM")}
                    className={cn("rounded-full px-4 py-1 text-xs font-bold transition-all", isPm ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DateTimeField };
