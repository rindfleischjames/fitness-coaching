"use client";

import { useState } from "react";

export interface CompareOption {
  date: string;
  label: string;
  url: string;
}

export default function CompareView({ options }: { options: CompareOption[] }) {
  const [leftIdx, setLeftIdx] = useState(options.length - 1);
  const [rightIdx, setRightIdx] = useState(0);

  if (options.length < 2) return null;

  const left = options[leftIdx];
  const right = options[rightIdx];

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Compare</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ComparePane label="Before" options={options} selected={rightIdx} onChange={setRightIdx} url={right.url} />
        <ComparePane label="After" options={options} selected={leftIdx} onChange={setLeftIdx} url={left.url} />
      </div>
    </div>
  );
}

function ComparePane({
  label,
  options,
  selected,
  onChange,
  url,
}: {
  label: string;
  options: CompareOption[];
  selected: number;
  onChange: (i: number) => void;
  url: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="photo-slot filled" style={{ aspectRatio: "3/4" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`${label} photo`} />
      </div>
      <select value={selected} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((o, i) => (
          <option key={o.date} value={i}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
