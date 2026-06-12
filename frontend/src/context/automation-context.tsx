import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { updateAutomationState } from "@/lib/settings-api";
import { useAuth } from "@/context/auth-context";

type AutomationContextValue = {
  active: boolean;
  toggle: () => void;
  setActive: (v: boolean) => void;
};

const AutomationContext = createContext<AutomationContextValue | null>(null);

export function AutomationProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState(false);
  const { user } = useAuth();

  const setActive = useCallback(
    async (v: boolean) => {
      setActiveState(v);
      if (user) await updateAutomationState(user.id, v);
    },
    [user]
  );

  const toggle = useCallback(() => {
    setActive(!active);
  }, [active, setActive]);

  return (
    <AutomationContext.Provider value={{ active, setActive, toggle }}>
      {children}
    </AutomationContext.Provider>
  );
}

export function useAutomation() {
  const ctx = useContext(AutomationContext);
  if (!ctx) throw new Error("useAutomation must be used within AutomationProvider");
  return ctx;
}