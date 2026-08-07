import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { planForN, totals, type PlanKey, type Tier1 } from "./pricing-model";

export interface PriceMatrix {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  licenses: number;
  tierAt1: Tier1;
  onTierAt1Change: (tier: Tier1) => void;
  annual: boolean;
  setAnnual: Dispatch<SetStateAction<boolean>>;
  selfHosted: boolean;
  setSelfHosted: Dispatch<SetStateAction<boolean>>;
  infoOpen: boolean;
  setInfoOpen: Dispatch<SetStateAction<boolean>>;
  animClass: string;
  plan: PlanKey;
  isFreeState: boolean;
  zoneKey: PlanKey;
  onZoneClick: (seats: number) => void;
  onSliderChange: (seats: number) => void;
  pricePerLic: number;
  monthlyTotal: number;
  annualTotal: number;
  saving: number;
}

/**
 * Estado y aritmética del modal "calcula tu mejor plan" de pricing.
 *
 * Vivía como 7 useState sueltos y 2 useEffect mezclados con el resto de
 * PricingPage. Aquí queda solo, para que el componente que lo pinta
 * (PriceMatrixModal) reciba datos ya resueltos.
 */
export function usePriceMatrix(): PriceMatrix {
  const [open, setOpen] = useState(false);
  const [licenses, setLicenses] = useState(1);
  const [tierAt1, setTierAt1] = useState<Tier1>("developer");
  const [annual, setAnnual] = useState(false);
  const [selfHosted, setSelfHosted] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const prevPlanRef = useRef<PlanKey>("developer");

  const plan = useMemo(() => planForN(licenses, tierAt1), [licenses, tierAt1]);

  useEffect(() => {
    if (prevPlanRef.current === plan) return;
    prevPlanRef.current = plan;
    setAnimClass("pm-card--exit");
    const enterTimer = setTimeout(() => setAnimClass("pm-card--enter"), 140);
    const clearTimer = setTimeout(() => setAnimClass(""), 360);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(clearTimer);
    };
  }, [plan]);

  useEffect(() => {
    if (!infoOpen) return;
    const close = () => setInfoOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [infoOpen]);

  const isFreeState = licenses <= 0 || plan === "rookie";
  const zoneKey: PlanKey = plan === "rookie" ? "developer" : plan;

  const onZoneClick = (seats: number) => {
    setLicenses(seats);
    setTierAt1("developer");
  };

  const onSliderChange = (seats: number) => {
    setLicenses(seats);
    if (seats !== 1) setTierAt1("developer");
  };

  const { pricePerLic, monthlyTotal, annualTotal, saving } = totals(licenses, selfHosted, annual);

  return {
    open,
    setOpen,
    licenses,
    tierAt1,
    onTierAt1Change: setTierAt1,
    annual,
    setAnnual,
    selfHosted,
    setSelfHosted,
    infoOpen,
    setInfoOpen,
    animClass,
    plan,
    isFreeState,
    zoneKey,
    onZoneClick,
    onSliderChange,
    pricePerLic,
    monthlyTotal,
    annualTotal,
    saving,
  };
}
