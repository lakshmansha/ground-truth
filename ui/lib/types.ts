export type Verdict = "SATISFIED" | "VIOLATED" | "UNKNOWN" | "PENDING";

export interface AuditResult {
  control_id: string;
  title: string;
  resource: string;
  verdict: Verdict;
  confidence: "grounded" | "abstained" | null;
  standard_citation: string | null;
  evidence_citation: string | null;
  reasoning: string;
  unknown_reason?: string;
  remediation?: string;
}

export interface AuditRun {
  id: string;
  started_at: string;
  completed_at?: string;
  results: AuditResult[];
}
