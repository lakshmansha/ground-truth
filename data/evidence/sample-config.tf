# Sample Azure Infrastructure Configuration — Terraform (Demo Evidence)
# This is a representative sample for demo/testing purposes only.
# It intentionally contains real violations for the "live catch" demo moment.

# -----------------------------------------------------------------
# Storage Accounts
# -----------------------------------------------------------------

resource "azurerm_storage_account" "app_storage" {
  name                     = "appstorageacct001"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # CIS 3.1 — SATISFIED: secure transfer is enabled
  enable_https_traffic_only = true

  # CIS 3.7 — SATISFIED: public blob access disabled
  allow_blob_public_access = false

  tags = {
    environment = "production"
    data_class  = "internal"
  }
}

resource "azurerm_storage_account" "customer_data_storage" {
  name                     = "customerdatastorage"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  # CIS 3.1 — SATISFIED: secure transfer is enabled
  enable_https_traffic_only = true

  # ❌ CIS 3.7 — VIOLATED: public blob access is ON for a customer data account
  # THIS IS THE DEMO "CATCH" — a storage account tagged customer_data is publicly accessible
  allow_blob_public_access = true

  tags = {
    environment = "production"
    data_class  = "customer_data"   # sensitive tag — makes the violation alarming
  }
}

# -----------------------------------------------------------------
# Network Security Groups
# -----------------------------------------------------------------

resource "azurerm_network_security_group" "web_nsg" {
  name                = "web-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # CIS 6.1 — SATISFIED: RDP is restricted to corp IP range only
  security_rule {
    name                       = "AllowRDP"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3389"
    source_address_prefix      = "10.0.0.0/8"   # internal only
    destination_address_prefix = "*"
  }

  # CIS 6.2 — SATISFIED: SSH is restricted to corp IP range only
  security_rule {
    name                       = "AllowSSH"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "10.0.0.0/8"   # internal only
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_security_group" "legacy_nsg" {
  name                = "legacy-app-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # CIS 6.1 — SATISFIED: RDP locked down
  security_rule {
    name                       = "AllowRDP"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3389"
    source_address_prefix      = "10.1.0.0/16"
    destination_address_prefix = "*"
  }

  # ❌ CIS 6.2 — VIOLATED: SSH open to the internet
  security_rule {
    name                       = "AllowSSHFromAnywhere"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"            # open to entire internet
    destination_address_prefix = "*"
  }
}

# -----------------------------------------------------------------
# SQL Server
# -----------------------------------------------------------------

resource "azurerm_sql_server" "main" {
  name                         = "main-sql-server"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password

  # CIS 4.1.1 — SATISFIED: auditing is configured
  extended_auditing_policy {
    storage_endpoint           = azurerm_storage_account.app_storage.primary_blob_endpoint
    retention_in_days          = 90
  }
}

# -----------------------------------------------------------------
# MySQL Flexible Server
# -----------------------------------------------------------------

# ⚠️ CIS 4.3.1 — UNKNOWN: no TLS version property present
# The agent should ABSTAIN here — config does not explicitly set ssl_minimal_tls_version_enforced
# This is the demo UNKNOWN / abstention moment
resource "azurerm_mysql_flexible_server" "main" {
  name                   = "main-mysql-server"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  administrator_login    = "mysqladmin"
  administrator_password = var.mysql_admin_password
  sku_name               = "GP_Standard_D4ds_v4"
  version                = "8.0.21"
  # ssl_minimal_tls_version_enforced not set — agent cannot determine compliance
}

# -----------------------------------------------------------------
# Key Vault (no CIS controls in this excerpt — present for realism)
# -----------------------------------------------------------------

resource "azurerm_key_vault" "main" {
  name                = "main-keyvault"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  purge_protection_enabled   = true
  soft_delete_retention_days = 90
}
