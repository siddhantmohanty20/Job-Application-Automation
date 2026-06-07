import { createContext, useContext, useState, type ReactNode } from "react";

type AutomationContextValue = {
  active: boolean;
  toggle: () => void;
  setActive: (v: boolean) => void;
};

const AutomationContext = createContext<AutomationContextValue | null>(null);

export function AutomationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(true);
  return (
    <AutomationContext.Provider
      value={{ active, setActive, toggle: () => setActive((p) => !p) }}
    >
      {children}
    </AutomationContext.Provider>
  );
}

export function useAutomation() {
  const ctx = useContext(AutomationContext);
  if (!ctx) throw new Error("useAutomation must be used within AutomationProvider");
  return ctx;
}
