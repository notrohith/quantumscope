"use client";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useState } from "react";
import { Info } from "lucide-react";
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={text}
            className="info-trigger"
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onClick={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setOpen(true);
              }
            }}
          >
            <Info size={14} />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={6} className="tooltip">
            {text}
            <TooltipPrimitive.Arrow className="fill-slate-700" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
