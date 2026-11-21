import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { FaqItem, WrittenRule } from "@/lib/arena-types";
import { groupWrittenRules } from "@/lib/rule-format";
import { FormattedEventText } from "@/components/formatted-event-text";

// Native details/summary: independent, collapsed by default, keyboard accessible,
// no JS state or hydration needed to open and close a category.
function AccordionItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="weji-faq group rounded-2xl border border-blue-100 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-4 text-sm font-bold text-[#142A55] transition-colors hover:bg-blue-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 group-open:text-blue-700 motion-reduce:transition-none sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
        <ChevronRight aria-hidden="true" size={17} className="shrink-0 text-blue-600 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
      </summary>
      <div className="min-w-0 space-y-4 border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">{children}</div>
    </details>
  );
}

export function RulesAccordion({ rules }: { rules: readonly WrittenRule[] }) {
  return <div className="space-y-3">
    {groupWrittenRules(rules).map(({ group, items }) => (
      <AccordionItem key={group} title={group || "Umum"}>
        {items.map((rule, i) => (
          <div key={rule.id} className={i ? "border-t border-slate-100 pt-4" : undefined}>
            <FormattedEventText text={rule.content} />
          </div>
        ))}
      </AccordionItem>
    ))}
  </div>;
}

export function FaqAccordion({ questions }: { questions: readonly FaqItem[] }) {
  return <div className="space-y-3">
    {questions.map(item => <AccordionItem key={item.id} title={item.question}>
      <FormattedEventText text={item.answer} />
    </AccordionItem>)}
  </div>;
}
