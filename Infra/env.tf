resource "azurerm_container_app_environment" "main" {
  name                = local.container_app_environment_name
  location            = local.container_apps_location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}
