import { DefaultAzureCredential } from "@azure/identity";
import { AIProjectClient } from "@azure/ai-projects";
import { AuditResult } from "@/lib/types";

const AUDIT_CONTROLS = [
  { control_id: "CIS-3.1",   title: "Secure transfer required enabled", resource: "app_storage" },
  { control_id: "CIS-3.7",   title: "Public blob access disabled",      resource: "app_storage" },
  { control_id: "CIS-3.7",   title: "Public blob access disabled",      resource: "customer_data_storage" },
  { control_id: "CIS-6.1",   title: "RDP access restricted",            resource: "web_nsg" },
  { control_id: "CIS-6.2",   title: "SSH access restricted",            resource: "web_nsg" },
  { control_id: "CIS-6.2",   title: "SSH access restricted",            resource: "legacy_nsg" },
  { control_id: "CIS-4.1.1", title: "SQL Server auditing enabled",      resource: "main SQL Server" },
  { control_id: "CIS-4.3.1", title: "MySQL TLS version >= 1.2",        resource: "main MySQL Server" },
];

function buildAuditMessage(controls: typeof AUDIT_CONTROLS): string {
  const controlList = controls
    .map((c, i) => `${i + 1}. ${c.control_id} — ${c.title} — resource: ${c.resource}`)
    .join("\n");

  return `You are a cloud security auditor. Using your knowledge sources, audit each CIS Azure Benchmark v2.0 control listed below.

Do a SINGLE broad knowledge base search that covers all controls in this batch — do not issue a separate search per control.

Return EXACTLY one verdict per control: SATISFIED, VIOLATED, or UNKNOWN
Rules:
- SATISFIED and VIOLATED require dual citations: one clause from the standard + one property from the evidence
- UNKNOWN is mandatory when the property is absent or indeterminate — never fabricate a verdict
- confidence: "grounded" when you found both citations, "abstained" when returning UNKNOWN
- remediation: for every VIOLATED control, provide a concrete, actionable fix referencing the specific Terraform property or ARM setting to change (e.g. "Set allow_blob_public_access = false on customer_data_storage"). null for SATISFIED and UNKNOWN.

Output a raw JSON array only — no markdown fencing, no text outside the array.

Schema for each element:
{
  "control_id": string,
  "title": string,
  "resource": string,
  "verdict": "SATISFIED" | "VIOLATED" | "UNKNOWN",
  "confidence": "grounded" | "abstained",
  "standard_citation": string | null,
  "evidence_citation": string | null,
  "reasoning": string,
  "unknown_reason": string | null,
  "remediation": string | null
}

Controls to audit:
${controlList}`;
}

export async function POST() {
  const encoder = new TextEncoder();

  function chunk(data: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (type: string, payload: object = {}) =>
        controller.enqueue(chunk({ type, ...payload }));

      try {
        emit("status", { message: "Connecting to Foundry IQ agent…" });

        const baseEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
        const projectName  = process.env.AZURE_AI_PROJECT_NAME;
        const agentName    = process.env.AZURE_AGENT_NAME ?? "ground-agent";

        if (!baseEndpoint || !projectName) {
          emit("error", { message: "Missing AZURE_AI_FOUNDRY_ENDPOINT or AZURE_AI_PROJECT_NAME in env" });
          controller.close();
          return;
        }

        const projectEndpoint = `${baseEndpoint}/api/projects/${projectName}`;
        const deployment      = process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o";
        const credential      = new DefaultAzureCredential();
        const projectClient   = new AIProjectClient(projectEndpoint, credential);

        // Routes baseURL to {endpoint}/agents/{agentName}/endpoint/protocols/openai
        // and injects HostedAgents preview headers automatically.
        const openAIClient = projectClient.getOpenAIClient({
          azureConfig: { agentName, allowPreview: true },
        });

        // Split into batches of 4 to stay under the Foundry IQ limit of 10 semantic intents per call
        const BATCH_SIZE = 4;
        const batches: (typeof AUDIT_CONTROLS)[] = [];
        for (let i = 0; i < AUDIT_CONTROLS.length; i += BATCH_SIZE) {
          batches.push(AUDIT_CONTROLS.slice(i, i + BATCH_SIZE));
        }

        const allResults: AuditResult[] = [];

        for (let b = 0; b < batches.length; b++) {
          const batch = batches[b];
          emit("status", { message: `Sending batch ${b + 1} of ${batches.length} (${batch.length} controls)…` });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let response: any = await openAIClient.responses.create({
            model: deployment,
            input: buildAuditMessage(batch),
          });

          for (let round = 0; round < 8; round++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pending: any[] = (response.output ?? []).filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (item: any) => item.type === "mcp_approval_request"
            );

            if (pending.length === 0) break;

            if (round === 0) {
              emit("status", { message: `Batch ${b + 1}: agent requested knowledge base access…` });
            }

            emit("status", { message: `Batch ${b + 1}: approving MCP retrieval · round ${round + 1}…` });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const approvals = pending.map((item: any) => ({
              type: "mcp_approval_response",
              approve: true,
              approval_request_id: item.id,
            }));

            response = await (openAIClient.responses.create as (...a: unknown[]) => Promise<unknown>)(
              {
                model: deployment,
                previous_response_id: response.id,
                input: approvals,
              }
            );
          }

          emit("status", { message: `Batch ${b + 1}: parsing grounded results…` });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const text: string = (response as any).output_text ?? "";

          if (!text.trim()) {
            emit("error", { message: `Agent returned empty output for batch ${b + 1}.` });
            controller.close();
            return;
          }

          const cleaned = text
            .replace(/^```(?:json)?\n?/m, "")
            .replace(/\n?```$/m, "")
            .trim();

          const batchResults: AuditResult[] = JSON.parse(cleaned);
          allResults.push(...batchResults);
        }

        const results = allResults;
        emit("done", { results });
        controller.close();
      } catch (err) {
        controller.enqueue(chunk({ type: "error", message: String(err) }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
