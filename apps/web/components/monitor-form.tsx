"use client";

import { useState } from "react";
import { MonitorType, DnsRecordType } from "@openmonitor/shared";

export interface MonitorFormValues {
  name: string;
  description: string;
  type: MonitorType;
  target: string;
  port: string;
  interval: number;
  timeout: number;
  retries: number;
  retryInterval: number;
  expectedStatusCodes: string;
  keyword: string;
  checkSslExpiry: boolean;
  sslExpiryThresholdDays: number;
  jsonPath: string;
  jsonExpectedValue: string;
  dnsRecordType: DnsRecordType;
  dnsExpectedValue: string;
  active: boolean;
}

export const DEFAULT_MONITOR_FORM: MonitorFormValues = {
  name: "",
  description: "",
  type: MonitorType.HTTP,
  target: "",
  port: "",
  interval: 60,
  timeout: 10,
  retries: 3,
  retryInterval: 20,
  expectedStatusCodes: "200-299",
  keyword: "",
  checkSslExpiry: false,
  sslExpiryThresholdDays: 14,
  jsonPath: "",
  jsonExpectedValue: "",
  dnsRecordType: DnsRecordType.A,
  dnsExpectedValue: "",
  active: true,
};

function field(label: string, children: React.ReactNode) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm";

export function MonitorForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<MonitorFormValues>;
  onSubmit: (values: MonitorFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<MonitorFormValues>({ ...DEFAULT_MONITOR_FORM, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof MonitorFormValues>(key: K, value: MonitorFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const isHttpLike = values.type === MonitorType.HTTP || values.type === MonitorType.JSON_QUERY;
  const needsPort = values.type === MonitorType.TCP || values.type === MonitorType.SSL;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && <div className="rounded-md bg-down/10 px-3 py-2 text-sm text-down">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        {field(
          "Name",
          <input required className={inputClass} value={values.name} onChange={(e) => update("name", e.target.value)} />
        )}
        {field(
          "Type",
          <select className={inputClass} value={values.type} onChange={(e) => update("type", e.target.value as MonitorType)}>
            {Object.values(MonitorType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {field(
        "Description",
        <textarea className={inputClass} rows={2} value={values.description} onChange={(e) => update("description", e.target.value)} />
      )}

      <div className="grid grid-cols-2 gap-4">
        {field(
          values.type === MonitorType.PING || values.type === MonitorType.DNS ? "Hostname" : "URL / Host",
          <input
            required
            className={inputClass}
            placeholder={isHttpLike ? "https://example.com" : "example.com"}
            value={values.target}
            onChange={(e) => update("target", e.target.value)}
          />
        )}
        {needsPort &&
          field(
            "Port",
            <input
              type="number"
              className={inputClass}
              value={values.port}
              onChange={(e) => update("port", e.target.value)}
            />
          )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {field(
          "Interval (s)",
          <input type="number" min={10} className={inputClass} value={values.interval} onChange={(e) => update("interval", Number(e.target.value))} />
        )}
        {field(
          "Timeout (s)",
          <input type="number" min={1} className={inputClass} value={values.timeout} onChange={(e) => update("timeout", Number(e.target.value))} />
        )}
        {field(
          "Retries",
          <input type="number" min={0} className={inputClass} value={values.retries} onChange={(e) => update("retries", Number(e.target.value))} />
        )}
        {field(
          "Retry interval (s)",
          <input
            type="number"
            min={1}
            className={inputClass}
            value={values.retryInterval}
            onChange={(e) => update("retryInterval", Number(e.target.value))}
          />
        )}
      </div>

      {isHttpLike && (
        <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="text-sm font-semibold">HTTP options</h3>
          {field(
            "Expected status codes",
            <input
              className={inputClass}
              placeholder="200-299"
              value={values.expectedStatusCodes}
              onChange={(e) => update("expectedStatusCodes", e.target.value)}
            />
          )}
          {values.type === MonitorType.HTTP &&
            field(
              "Keyword to look for in the response body (optional)",
              <input className={inputClass} value={values.keyword} onChange={(e) => update("keyword", e.target.value)} />
            )}
          {values.type === MonitorType.JSON_QUERY && (
            <div className="grid grid-cols-2 gap-4">
              {field(
                "JSON path (e.g. data.status)",
                <input className={inputClass} value={values.jsonPath} onChange={(e) => update("jsonPath", e.target.value)} />
              )}
              {field(
                "Expected value",
                <input className={inputClass} value={values.jsonExpectedValue} onChange={(e) => update("jsonExpectedValue", e.target.value)} />
              )}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={values.checkSslExpiry} onChange={(e) => update("checkSslExpiry", e.target.checked)} />
            Warn about expiring TLS certificates
          </label>
          {values.checkSslExpiry &&
            field(
              "Warn when fewer than N days remain",
              <input
                type="number"
                min={1}
                className={inputClass}
                value={values.sslExpiryThresholdDays}
                onChange={(e) => update("sslExpiryThresholdDays", Number(e.target.value))}
              />
            )}
        </div>
      )}

      {values.type === MonitorType.DNS && (
        <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="text-sm font-semibold">DNS options</h3>
          <div className="grid grid-cols-2 gap-4">
            {field(
              "Record type",
              <select className={inputClass} value={values.dnsRecordType} onChange={(e) => update("dnsRecordType", e.target.value as DnsRecordType)}>
                {Object.values(DnsRecordType).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            {field(
              "Expected value (optional)",
              <input className={inputClass} value={values.dnsExpectedValue} onChange={(e) => update("dnsExpectedValue", e.target.value)} />
            )}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.active} onChange={(e) => update("active", e.target.checked)} />
        Active
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
