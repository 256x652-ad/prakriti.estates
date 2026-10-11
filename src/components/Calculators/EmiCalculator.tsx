"use client";

import { useForm, useWatch } from "react-hook-form";
import { useEffect, useState } from "react";

interface EmiFormData {
  principalAmount: number;
  interestRate: number; // Annual %
  tenureYears: number;
}

export default function EmiCalculator() {
  const { register, control, setValue } = useForm<EmiFormData>({
    defaultValues: {
      principalAmount: 5000000, // 50 Lakhs
      interestRate: 8.5,
      tenureYears: 20,
    }
  });

  const [emi, setEmi] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);

  const principal = useWatch({ control, name: "principalAmount" });
  const rate = useWatch({ control, name: "interestRate" });
  const tenure = useWatch({ control, name: "tenureYears" });

  useEffect(() => {
    // EMI Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
    // r = monthly interest rate = annual rate / (12 * 100)
    // n = tenure in months = tenure in years * 12
    if (!principal || !rate || !tenure) return;

    const p = principal;
    const r = rate / 12 / 100;
    const n = tenure * 12;

    if (r === 0) {
      setEmi(p / n);
      setTotalInterest(0);
      return;
    }

    const emiCalc = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setEmi(Math.round(emiCalc));
    setTotalInterest(Math.round((emiCalc * n) - p));
  }, [principal, rate, tenure]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-white rounded-xl shadow-premium border p-6 max-w-md w-full">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Home Loan EMI Calculator</h3>
      
      <div className="space-y-6">
        {/* Principal Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-gray-600">Loan Amount</label>
            <span className="text-lg font-bold text-prakriti-900">{formatCurrency(principal)}</span>
          </div>
          <input 
            type="range" 
            min={1000000} 
            max={50000000} 
            step={100000} 
            {...register("principalAmount", { valueAsNumber: true })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-prakriti-600"
          />
        </div>

        {/* Rate Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-gray-600">Interest Rate</label>
            <span className="text-lg font-bold text-prakriti-900">{rate}% p.a.</span>
          </div>
          <input 
            type="range" 
            min={5} 
            max={15} 
            step={0.1} 
            {...register("interestRate", { valueAsNumber: true })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-prakriti-600"
          />
        </div>

        {/* Tenure Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-gray-600">Loan Tenure</label>
            <span className="text-lg font-bold text-prakriti-900">{tenure} Years</span>
          </div>
          <input 
            type="range" 
            min={1} 
            max={30} 
            step={1} 
            {...register("tenureYears", { valueAsNumber: true })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-prakriti-600"
          />
        </div>
      </div>

      {/* Results Box */}
      <div className="mt-8 p-5 bg-prakriti-50 rounded-lg border border-prakriti-200 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-prakriti-800 font-medium">Monthly EMI</span>
          <span className="text-2xl font-bold text-prakriti-700">{formatCurrency(emi)}</span>
        </div>
        <div className="h-px bg-prakriti-200 w-full" />
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total Interest Payable</span>
          <span className="font-semibold text-gray-900">{formatCurrency(totalInterest)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total Payment (Prin + Int)</span>
          <span className="font-semibold text-gray-900">{formatCurrency(principal + totalInterest)}</span>
        </div>
      </div>
    </div>
  );
}
