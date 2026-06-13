# Sample Azure Infrastructure Configuration (Terraform Evidence)

This file is the evidence corpus for Ground Truth audit. It represents a Terraform IaC configuration for an Azure environment with intentional security posture variations for demonstration.

---

## Storage Accounts

### app_storage

```
resource: azurerm_storage_account.app_storage
name: appstorageacct001
enable_https_traffic_only: true
allow_blob_public_access: false
tags: environment=production, data_class=internal
```

CIS 3.1 — enable_https_traffic_only = true (line 17)
CIS 3.7 — allow_blob_public_access = false (line 20)

---

### customer_data_storage

```
resource: azurerm_storage_account.customer_data_storage
name: customerdatastorage
enable_https_traffic_only: true
allow_blob_public_access: true
tags: environment=production, data_class=customer_data
```

CIS 3.1 — enable_https_traffic_only = true (line 36)
CIS 3.7 — allow_blob_public_access = true (line 40) ← VIOLATION: public access enabled on customer data account

---

## Network Security Groups

### web_nsg

```
resource: azurerm_network_security_group.web_nsg
name: web-nsg

security_rule AllowRDP:
  destination_port_range: 3389
  source_address_prefix: 10.0.0.0/8
  access: Allow

security_rule AllowSSH:
  destination_port_range: 22
  source_address_prefix: 10.0.0.0/8
  access: Allow
```

CIS 6.1 — RDP source_address_prefix = 10.0.0.0/8 (line 66) — restricted to internal only
CIS 6.2 — SSH source_address_prefix = 10.0.0.0/8 (line 79) — restricted to internal only

---

### legacy_nsg

```
resource: azurerm_network_security_group.legacy_nsg
name: legacy-app-nsg

security_rule AllowRDP:
  destination_port_range: 3389
  source_address_prefix: 10.1.0.0/16
  access: Allow

security_rule AllowSSHFromAnywhere:
  destination_port_range: 22
  source_address_prefix: *
  access: Allow
```

CIS 6.1 — RDP source_address_prefix = 10.1.0.0/16 (line 98) — restricted
CIS 6.2 — SSH source_address_prefix = * (line 111) ← VIOLATION: SSH open to entire internet

---

## SQL Server

### main (SQL Server)

```
resource: azurerm_sql_server.main
name: main-sql-server
version: 12.0

extended_auditing_policy:
  storage_endpoint: app_storage.primary_blob_endpoint
  retention_in_days: 90
```

CIS 4.1.1 — extended_auditing_policy retention_in_days = 90 (line 129) — auditing configured

---

## MySQL Flexible Server

### main (MySQL Server)

```
resource: azurerm_mysql_flexible_server.main
name: main-mysql-server
administrator_login: mysqladmin
sku_name: GP_Standard_D4ds_v4
version: 8.0.21
ssl_minimal_tls_version_enforced: NOT SET
```

CIS 4.3.1 — ssl_minimal_tls_version_enforced is absent from configuration (line 150) — compliance cannot be determined

---

## Key Vault

### main (Key Vault)

```
resource: azurerm_key_vault.main
name: main-keyvault
sku_name: standard
purge_protection_enabled: true
soft_delete_retention_days: 90
```

No CIS controls mapped to this resource in the current excerpt.
