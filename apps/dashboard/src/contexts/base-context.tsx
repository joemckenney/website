import { createContext, type ReactNode, useContext, useState } from "react";

interface BaseContextValue {
  baseName: string | null;
  setBaseName: (name: string | null) => void;
}

const BaseContext = createContext<BaseContextValue | null>(null);

export function BaseProvider({ children }: { children: ReactNode }) {
  const [baseName, setBaseName] = useState<string | null>(null);

  return (
    <BaseContext.Provider value={{ baseName, setBaseName }}>
      {children}
    </BaseContext.Provider>
  );
}

export function useBaseContext() {
  const context = useContext(BaseContext);
  if (!context) {
    throw new Error("useBaseContext must be used within a BaseProvider");
  }
  return context;
}
