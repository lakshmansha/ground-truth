# CIS Microsoft Azure Foundations Benchmark — Selected Controls (Demo Excerpt)

> Source: CIS Azure Benchmark v2.0 (public). Subset selected for Ground Truth demo.
> Full benchmark: https://www.cisecurity.org/benchmark/azure

---

## Section 3 — Storage Accounts

### CIS 3.1 — Ensure that 'Secure transfer required' is set to 'Enabled' for Storage Accounts

**Profile:** Level 1
**Description:** Enable data encryption in transit. The "Secure transfer required" option enhances the security of a storage account by only allowing requests to the storage account by secure connection. This setting rejects access via HTTP.

**Rationale:** Enabling "Secure transfer required" ensures HTTPS is required for all access, preventing unencrypted traffic.

**Expected state:** `enable_https_traffic_only = true` (Terraform) / `supportsHttpsTrafficOnly: true` (ARM)

---

### CIS 3.2 — Ensure that storage account access keys are periodically regenerated

**Profile:** Level 1
**Description:** Storage account access keys should be rotated periodically to reduce the window of exposure if a key is compromised.

**Rationale:** Periodic key rotation limits blast radius of a leaked access key.

**Expected state:** Key rotation policy configured; last rotation within 90 days.

---

### CIS 3.7 — Ensure that 'Public access level' is set to 'Private' for blob containers

**Profile:** Level 1
**Description:** Disabling public access prevents anonymous, unauthenticated access to blob storage. No blob container should have public read access enabled unless explicitly required.

**Rationale:** Publicly readable blob containers can expose sensitive data to anyone on the internet.

**Expected state:** `allow_blob_public_access = false` (Terraform) / `publicAccess: None` (ARM)

---

## Section 6 — Networking

### CIS 6.1 — Ensure that RDP access from the internet is evaluated and restricted

**Profile:** Level 1
**Description:** Network Security Group rules allowing inbound RDP (port 3389) from any source address (0.0.0.0/0 or *) should not exist unless specifically justified.

**Rationale:** Open RDP is a primary vector for brute-force and ransomware attacks.

**Expected state:** No NSG rule with `destination_port_range = "3389"` and `source_address_prefix = "*"` or `"0.0.0.0/0"`.

---

### CIS 6.2 — Ensure that SSH access from the internet is evaluated and restricted

**Profile:** Level 1
**Description:** Network Security Group rules allowing inbound SSH (port 22) from any source address should not exist unless specifically justified.

**Rationale:** Open SSH access from the internet exposes systems to brute-force attacks.

**Expected state:** No NSG rule with `destination_port_range = "22"` and `source_address_prefix = "*"` or `"0.0.0.0/0"`.

---

## Section 4 — Database Services

### CIS 4.1.1 — Ensure that 'Auditing' is set to 'On' for the SQL Server

**Profile:** Level 1
**Description:** SQL Server Auditing tracks database events and writes them to an audit log in your Azure storage account. Enable auditing on all SQL Servers.

**Rationale:** Auditing enables detection of anomalous activities and provides a forensic trail.

**Expected state:** `extended_auditing_policy` configured on SQL Server resource.

---

### CIS 4.3.1 — Ensure 'TLS Version' is set to 'TLSV1.2' or higher for MySQL flexible servers

**Profile:** Level 1
**Description:** Older TLS versions have known vulnerabilities. MySQL flexible servers should enforce TLS 1.2 or higher.

**Expected state:** `ssl_minimal_tls_version_enforced = "TLS1_2"` or higher.
