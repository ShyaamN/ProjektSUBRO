import type { View } from "./store";

export interface SectionDef { id: string; label: string; }

export const SECTIONS: Record<View, SectionDef[]> = {
  trading: [
    { id: "glance", label: "At a glance" },
    { id: "list", label: "All claims" },
    { id: "one", label: "One claim" },
  ],
  underwriting: [
    { id: "answer", label: "The answer" },
    { id: "checks", label: "The five checks" },
  ],
  capital: [
    { id: "rules", label: "Your rules" },
    { id: "suggested", label: "Suggested buys" },
    { id: "bought", label: "Already bought" },
  ],
  arena: [
    { id: "chase", label: "The chase" },
    { id: "standing", label: "Where it stands" },
  ],
  autopilot: [
    { id: "run", label: "Run it" },
    { id: "log", label: "Log" },
  ],
  scenarios: [
    { id: "first", label: "Stories 1 to 3" },
    { id: "second", label: "Stories 4 to 6" },
  ],
  ledger: [
    { id: "money", label: "Money list" },
    { id: "turned", label: "How claims turned out" },
    { id: "history", label: "History" },
  ],
};

export const firstSection = (view: View) => SECTIONS[view][0].id;
