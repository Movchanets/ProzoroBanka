locals {
  name_prefix = "${var.project_name}-${var.environment}"

  resource_group_name            = var.resource_group_name != "" ? var.resource_group_name : "${local.name_prefix}-rg"
  container_app_environment_name = var.container_app_environment_name != "" ? var.container_app_environment_name : "${local.name_prefix}-cae"
  api_container_app_name         = var.api_container_app_name != "" ? var.api_container_app_name : "${local.name_prefix}-api"
  static_web_app_name            = var.static_web_app_name != "" ? var.static_web_app_name : "${local.name_prefix}-swa"
  storage_account_name           = var.storage_account_name != "" ? var.storage_account_name : substr(replace("${var.project_name}${var.environment}blob", "-", ""), 0, 24)
  container_apps_location        = var.container_apps_location != "" ? var.container_apps_location : var.location

  storage_connection_string = format(
    "DefaultEndpointsProtocol=https;AccountName=%s;AccountKey=%s;EndpointSuffix=core.windows.net",
    azurerm_storage_account.main.name,
    azurerm_storage_account.main.primary_access_key
  )

  default_frontend_origin = "https://${azurerm_static_web_app.frontend.default_host_name}"
  custom_frontend_origin  = var.static_web_app_custom_domain != "" ? "https://${var.static_web_app_custom_domain}" : null
  cors_allowed_origins = distinct(compact(concat(
    [local.default_frontend_origin],
    local.custom_frontend_origin != null ? [local.custom_frontend_origin] : [],
    var.additional_cors_allowed_origins
  )))

  common_tags = merge(
    {
      project      = "ProzoroBanka"
      environment  = var.environment
      managed_by   = "terraform"
      architecture = "container-apps-static-web-apps-blob"
    },
    var.tags
  )
}
