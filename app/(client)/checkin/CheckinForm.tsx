"use client";

import { useState } from "react";
import { submitCheckin } from "./actions";
import { displayWeight } from "@/lib/units";

export default function CheckinForm({
  defaultUnit,
  lastWeightKg,
  hasError,
}: {
  defaultUnit: "lbs" | "kg";
  lastWeightKg: number | null;
  hasError: boolean;
}) {
  const [unit, setUnit] = useState<"lbs" | "kg">(defaultUnit);
  const [fasted, setFasted] = useState(true);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const defaultWeight = lastWeightKg != null ? displayWeight(lastWeightKg, defaultUnit) : "";

  function addPhotos(fileList: FileList | null) {
    if (!fileList) return;
    const next = Array.from(fileList).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...next]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form
      action={(formData) => {
        photos.forEach((p) => formData.append("photos", p.file));
        setSubmitting(true);
        submitCheckin(formData);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div className="weigh-field">
        <label htmlFor="weight" className="card-title" style={{ color: "var(--ink-600)" }}>
          Weight
        </label>
        <div className="weigh-value">
          <input
            id="weight"
            name="weight"
            type="number"
            step="0.1"
            inputMode="decimal"
            required
            defaultValue={defaultWeight}
            placeholder="0.0"
          />
          <div className="unit-toggle">
            <button type="button" className={unit === "lbs" ? "active" : ""} onClick={() => setUnit("lbs")}>
              lbs
            </button>
            <button type="button" className={unit === "kg" ? "active" : ""} onClick={() => setUnit("kg")}>
              kg
            </button>
          </div>
        </div>
        <input type="hidden" name="unit" value={unit} />
      </div>

      {hasError && <p className="hint" style={{ color: "var(--critical)" }}>Enter a valid weight.</p>}

      <div className="toggle-row">
        <span className="card-title">Fasted weigh-in</span>
        <button
          type="button"
          className={`switch${fasted ? " on" : ""}`}
          onClick={() => setFasted((f) => !f)}
          aria-pressed={fasted}
        />
        <input type="hidden" name="fasted" value={fasted ? "on" : "off"} />
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Photos <span style={{ textTransform: "none", fontWeight: 500 }}>· optional, any angle</span>
        </div>
        <div className="photo-grid">
          {photos.map((p, i) => (
            <div key={p.url} className="photo-slot filled">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label="Remove photo"
                style={{ position: "absolute", top: 4, right: 4, zIndex: 1, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          ))}
          <label className="photo-slot empty">
            +
            <input type="file" accept="image/*" multiple capture="environment" onChange={(e) => addPhotos(e.target.files)} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Note (optional)</label>
        <textarea id="notes" name="notes" placeholder="How are you feeling?" />
      </div>

      <button className="btn btn-accent btn-block" type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Submit check-in"}
      </button>
    </form>
  );
}
