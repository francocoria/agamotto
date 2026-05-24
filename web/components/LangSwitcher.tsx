"use client";
import { useState } from "react";

const LANGS = ["ES", "PT", "EN"] as const;

export function LangSwitcher() {
  const [active, setActive] = useState<(typeof LANGS)[number]>("ES");
  return (
    <div className="agm-lang">
      {LANGS.map((l) => (
        <button key={l} className={l === active ? "active" : ""} onClick={() => setActive(l)}>
          {l}
        </button>
      ))}
    </div>
  );
}
