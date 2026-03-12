output "resource_group_name" {
  value       = azurerm_resource_group.main.name
  description = "Azure resource group name."
}

output "container_app_environment_name" {
  value       = azurerm_container_app_environment.main.name
  description = "Azure Container Apps environment name."
}

output "api_container_app_name" {
  value       = azurerm_container_app.api.name
  description = "Backend Azure Container App name."
}

output "api_hostname" {
  value       = azurerm_container_app.api.latest_revision_fqdn
  description = "Public hostname of the backend Container App."
}

output "api_base_url" {
  value       = "https://${azurerm_container_app.api.latest_revision_fqdn}"
  description = "Base URL consumed by the frontend Vite build."
}

output "static_web_app_name" {
  value       = azurerm_static_web_app.frontend.name
  description = "Azure Static Web App name."
}

output "static_web_app_default_hostname" {
  value       = azurerm_static_web_app.frontend.default_host_name
  description = "Default hostname of the Azure Static Web App."
}

output "static_web_app_url" {
  value       = "https://${azurerm_static_web_app.frontend.default_host_name}"
  description = "Public URL of the Azure Static Web App."
}

output "static_web_app_custom_domain" {
  value       = try(azurerm_static_web_app_custom_domain.frontend[0].domain_name, null)
  description = "Custom domain attached to the Azure Static Web App, if configured."
}

output "ocr_azure_resource_name" {
  value       = try(azurerm_cognitive_account.ocr[0].name, null)
  description = "Azure Document Intelligence resource name, if Terraform creates it."
}

output "ocr_azure_endpoint" {
  value       = local.ocr_azure_endpoint != "" ? local.ocr_azure_endpoint : null
  sensitive   = true
  description = "Azure Document Intelligence endpoint used by the backend."
}

output "ocr_azure_api_key" {
  value       = local.ocr_azure_api_key != "" ? local.ocr_azure_api_key : null
  sensitive   = true
  description = "Azure Document Intelligence API key used by the backend."
}

output "storage_account_name" {
  value       = azurerm_storage_account.main.name
  description = "Azure Storage account name used for Blob file storage."
}

output "storage_container_name" {
  value       = azurerm_storage_container.uploads.name
  description = "Azure Blob container name used by the backend."
}

output "storage_connection_string" {
  value       = local.storage_connection_string
  sensitive   = true
  description = "Azure Blob Storage connection string wired into Container Apps."
}

output "storage_primary_blob_endpoint" {
  value       = azurerm_storage_account.main.primary_blob_endpoint
  description = "Primary Azure Blob endpoint for the storage account."
}
