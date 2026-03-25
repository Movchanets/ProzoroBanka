resource "azurerm_static_web_app" "frontend" {
  name                = local.static_web_app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.common_tags
}

resource "azurerm_static_web_app_custom_domain" "frontend" {
  count = var.static_web_app_custom_domain != "" ? 1 : 0

  static_web_app_id = azurerm_static_web_app.frontend.id
  domain_name       = var.static_web_app_custom_domain
  validation_type   = var.static_web_app_custom_domain_validation_type
}

resource "azurerm_static_web_app_custom_domain" "frontend_root" {
  count = var.static_web_app_root_custom_domain != "" ? 1 : 0

  static_web_app_id = azurerm_static_web_app.frontend.id
  domain_name       = var.static_web_app_root_custom_domain
  validation_type   = var.static_web_app_root_custom_domain_validation_type
}
