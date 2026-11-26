"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CircleHelp, TriangleAlert } from "lucide-react";

type Action = {
  title: string;
  description: string;
  accept: string;
  cancel?: string;
  destructive?: boolean;
  notice?: boolean;
};
type Ask = (action: Action) => Promise<boolean>;
const ActionContext = createContext<Ask | null>(null);

export function useActionDialog() {
  const ask = useContext(ActionContext);
  if (!ask) throw new Error("ActionDialogProvider is required");
  return ask;
}

export function ActionDialogProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<Action | null>(null);
  const pending = useRef<((answer: boolean) => void) | null>(null);
  const focusButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const ask: Ask = useCallback((next) => {
    if (pending.current) return Promise.resolve(false);
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setAction(next);
    });
  }, []);
  const finish = (answer: boolean) => {
    const resolve = pending.current;
    if (!resolve) return;
    pending.current = null;
    setAction(null);
    resolve(answer);
  };
  useEffect(
    () => () => {
      pending.current?.(false);
      pending.current = null;
    },
    [],
  );
  return (
    <ActionContext.Provider value={ask}>
      {children}
      <Dialog.Root
        open={!!action}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        {action && (
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[150] bg-slate-950/55 backdrop-blur-sm" />
            <Dialog.Content
              role="alertdialog"
              className="fixed left-1/2 top-1/2 z-[151] max-h-[90dvh] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-2xl outline-none sm:p-6"
              onPointerDownOutside={(event) => event.preventDefault()}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                focusButton.current?.focus();
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                if (!pending.current && opener.current?.isConnected)
                  opener.current.focus();
              }}
            >
              {action.destructive ? (
                <TriangleAlert aria-hidden className="mb-3 text-rose-600" />
              ) : (
                <CircleHelp aria-hidden className="mb-3 text-blue-600" />
              )}
              <Dialog.Title className="break-words text-lg font-extrabold">
                {action.title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                {action.description}
              </Dialog.Description>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {!action.notice && (
                  <button
                    ref={focusButton}
                    type="button"
                    className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold focus-visible:outline-blue-600"
                    onClick={() => finish(false)}
                  >
                    {action.cancel ?? "Kembali"}
                  </button>
                )}
                <button
                  ref={action.notice ? focusButton : undefined}
                  type="button"
                  className={`min-h-11 rounded-xl px-4 text-sm font-bold text-white focus-visible:outline-blue-600 ${action.destructive ? "bg-rose-600" : "bg-blue-600"}`}
                  onClick={() => finish(true)}
                >
                  {action.accept}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </Dialog.Root>
    </ActionContext.Provider>
  );
}
