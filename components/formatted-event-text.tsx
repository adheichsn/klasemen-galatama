import { Fragment } from "react";
import { inlineParts, parseRuleText } from "@/lib/rule-format";

function InlineText({ text }: { text: string }) {
  return <>{inlineParts(text).map((part, i) => part.kind === "bold"
    ? <strong key={i} className="font-bold text-slate-800">{part.text}</strong>
    : part.kind === "italic"
      ? <em key={i}>{part.text}</em>
      : <Fragment key={i}>{part.text}</Fragment>)}</>;
}

/** React text nodes only: no raw HTML, link parsing or executable markup. */
export function FormattedEventText({ text }: { text: string }) {
  return (
    <div className="min-w-0 space-y-3 text-sm font-normal leading-7 text-slate-600 [overflow-wrap:anywhere]">
      {parseRuleText(text).map((block, i) => {
        switch (block.kind) {
          case "heading":
            return <p key={i} className="font-extrabold text-blue-800"><InlineText text={block.text} /></p>;
          case "ordered":
            return <ol key={i} start={block.items[0].number} className="list-outside list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-blue-700">
              {block.items.map((item, j) => <li key={j} value={item.number} className="pl-1"><InlineText text={item.text} /></li>)}
            </ol>;
          case "bullet":
            return <ul key={i} className="list-outside list-disc space-y-1.5 pl-5 marker:text-blue-600">
              {block.items.map((item, j) => <li key={j} className="pl-1"><InlineText text={item.text} /></li>)}
            </ul>;
          default:
            return <p key={i} className="whitespace-pre-wrap"><InlineText text={block.text} /></p>;
        }
      })}
    </div>
  );
}
