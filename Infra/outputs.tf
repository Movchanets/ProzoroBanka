output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "api_url" {
  value = azurerm_container_app.api.ingress[0].fqdn
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}
