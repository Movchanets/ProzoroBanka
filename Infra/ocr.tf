resource "azurerm_cognitive_account" "ocr" {
  count = var.create_ocr_azure_resource ? 1 : 0

  name                = local.ocr_azure_resource_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "FormRecognizer"
  sku_name            = var.ocr_azure_sku_name

  local_auth_enabled = true

  tags = local.common_tags
}
