import { useEffect, useRef, useState } from "react";
import { AVAILABLE_LOCALES, useLocale } from "../../context/LocaleContext";
import { useFieldEnergy } from "../../hooks/useFieldEnergy";
import { pulseLiquid } from "../../lib/liquid";
import { warpPulse } from "../../lib/warp";

export default function LangSwitch() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const warpRef = useRef<HTMLDivElement | null>(null);
  const energy = useFieldEnergy<HTMLButtonElement>({ radius: 140, step: 0.1 });

  const currentOption =
    AVAILABLE_LOCALES.find((opt) => opt.code === locale) ?? AVAILABLE_LOCALES[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    pulseLiquid(e.clientX, e.clientY, 0.9);
    energy.bump(0.75);
    setOpen((prev) => !prev);
    if (!open && warpRef.current) {
      warpPulse(warpRef.current, { amount: 6, duration: 0.35 });
    }
  };

  const select = (code: typeof locale, e: React.MouseEvent<HTMLButtonElement>) => {
    pulseLiquid(e.clientX, e.clientY, 1.1);
    setLocale(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="lang" data-open={open ? "true" : "false"}>
      <button
        ref={energy.ref}
        type="button"
        className="lang__btn"
        onClick={toggle}
        aria-label={`Change language, current is ${currentOption.nativeName}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="lang__fog" aria-hidden="true" />
        <span className="lang__code ltr">{currentOption.label}</span>
      </button>

      {open && (
        <div
          className="lang__menu"
          role="listbox"
          aria-label="Select language"
        >
          <div ref={warpRef} className="lang__warp">
            {AVAILABLE_LOCALES.map((opt) => {
              const isSelected = opt.code === locale;
              return (
                <button
                  key={opt.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="lang__option"
                  onClick={(e) => select(opt.code, e)}
                >
                  <span className="lang__option-code ltr">{opt.label}</span>
                  <span className="lang__option-name">{opt.nativeName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
