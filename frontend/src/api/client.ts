const BASE = "/api/v1";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return (body.data ?? body) as T;
}

async function post<T>(path: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return (body.data ?? body) as T;
}

export interface Tariff {
  tariff_type: string;
  amount: number;
  currency: string;
}

export interface ServiceOut {
  id: string;
  name: string;
  category: string | null;
  icd_code: string | null;
  is_active: boolean;
}

export interface PartnerOut {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
}

export interface SearchResultItem {
  item_id: string;
  partner_id: string;
  service_name_raw: string;
  service_id: string | null;
  effective_date: string | null;
  tariffs: Tariff[];
  is_anomaly: boolean;
}

export interface SearchOut {
  query: string;
  items: SearchResultItem[];
  total: number;
}

export interface UnmatchedItem {
  item_id: string;
  partner_id: string;
  service_name_raw: string;
  service_code_source: string | null;
  provenance: Record<string, unknown> | null;
  tariffs: Tariff[];
}

export interface UnmatchedListOut {
  items: UnmatchedItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PartnerServiceItem {
  item_id: string;
  service_id: string | null;
  service_name_raw: string;
  effective_date: string | null;
  tariffs: Tariff[];
  is_anomaly: boolean;
  match_method: string;
  match_confidence: number | null;
}

export interface Stats {
  total_documents: number;
  documents_by_status: Record<string, number>;
  total_items: number;
  items_matched: number;
  items_unmatched: number;
  match_rate_pct: number;
  anomalies: number;
  items_by_method: Record<string, number>;
  partners_active: number;
  services_count: number;
}

export const api = {
  search: (q: string) => get<SearchOut>(`/search?q=${encodeURIComponent(q)}&limit=50`),
  getPartners: () => get<{ items: PartnerOut[]; total: number }>("/partners"),
  getPartner: (id: string) => get<PartnerOut>(`/partners/${id}`),
  getPartnerServices: (id: string) =>
    get<{ partner_id: string; items: PartnerServiceItem[] }>(`/partners/${id}/services`),
  getServices: (q?: string) =>
    get<{ items: ServiceOut[]; total: number }>(`/services${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getServicePartners: (id: string) =>
    get<{ service_id: string; partners: Array<{ partner_id: string; tariffs: Tariff[]; effective_date: string | null; is_anomaly: boolean }> }>(
      `/services/${id}/partners`
    ),
  getUnmatched: (offset = 0) => get<UnmatchedListOut>(`/unmatched?limit=50&offset=${offset}`),
  match: (item_id: string, service_id: string, note?: string) =>
    post("/match", { item_id, service_id, note }),
  getStats: () => get<Stats>("/admin/stats"),
};
