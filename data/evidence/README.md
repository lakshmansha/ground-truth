# Evidence corpus — sample-config.tf

Representative Terraform IaC for demo purposes. **Intentional violations planted for the "live catch" demo moment:**

| Control | Resource | Status | Demo purpose |
|---|---|---|---|
| CIS 3.1 | `app_storage` | ✅ SATISFIED | Show a clean receipt |
| CIS 3.7 | `app_storage` | ✅ SATISFIED | Show a clean receipt |
| CIS 3.7 | `customer_data_storage` | ❌ VIOLATED | **The catch** — customer data storage is publicly accessible |
| CIS 6.1 | `web_nsg` | ✅ SATISFIED | Show a clean receipt |
| CIS 6.2 | `web_nsg` | ✅ SATISFIED | Show a clean receipt |
| CIS 6.1 | `legacy_nsg` | ✅ SATISFIED | Clean |
| CIS 6.2 | `legacy_nsg` | ❌ VIOLATED | SSH open to internet |
| CIS 4.1.1 | `main` SQL Server | ✅ SATISFIED | Auditing configured |
| CIS 4.3.1 | `main` MySQL Server | ⚠️ UNKNOWN | **The abstention** — TLS property absent; agent must not guess |

The UNKNOWN on CIS 4.3.1 is the demo's signature moment — the agent abstains rather than fabricating a verdict.
