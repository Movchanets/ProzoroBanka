resource "azurerm_container_app" "api" {
  name                         = local.api_container_app_name
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"
  tags                         = local.common_tags

  identity {
    type = "SystemAssigned"
  }

  registry {
    server               = var.github_registry_server
    username             = var.github_registry_username
    password_secret_name = "ghcr-password"
  }

  secret {
    name  = "ghcr-password"
    value = var.github_registry_password
  }

  secret {
    name  = "database-connection-string"
    value = var.database_connection_string
  }

  secret {
    name  = "blob-connection-string"
    value = local.storage_connection_string
  }

  secret {
    name  = "jwt-key"
    value = var.jwt_key
  }

  secret {
    name  = "jwt-refresh-key"
    value = var.jwt_refresh_key
  }

  secret {
    name  = "encryption-key"
    value = var.encryption_key
  }

  secret {
    name  = "turnstile-secret-key"
    value = var.turnstile_secret_key
  }

  secret {
    name  = "google-client-id"
    value = var.google_client_id
  }

  secret {
    name  = "google-client-secret"
    value = var.google_client_secret
  }

  secret {
    name  = "email-smtp-username"
    value = var.email_smtp_username
  }

  secret {
    name  = "email-smtp-password"
    value = var.email_smtp_password
  }

  secret {
    name  = "email-resend-api-key"
    value = var.email_resend_api_key
  }

  secret {
    name  = "seed-admin-password"
    value = var.seed_admin_password
  }

  secret {
    name  = "ocr-mistral-api-key"
    value = var.ocr_mistral_api_key
  }

  secret {
    name  = "ocr-openrouter-api-key"
    value = var.ocr_openrouter_api_key
  }

  secret {
    name  = "redis-connection-string"
    value = var.redis_connection_string
  }

  ingress {
    external_enabled           = true
    target_port                = 8080
    allow_insecure_connections = false

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.container_min_replicas
    max_replicas = var.container_max_replicas

    http_scale_rule {
      name                = "http-scale"
      concurrent_requests = 20
    }

    container {
      name   = "api"
      image  = var.api_image
      cpu    = var.container_cpu
      memory = var.container_memory

      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = var.environment == "prod" ? "Production" : "Development"
      }

      env {
        name  = "ASPNETCORE_URLS"
        value = "http://+:8080"
      }

      env {
        name        = "ConnectionStrings__DefaultConnection"
        secret_name = "database-connection-string"
      }

      env {
        name  = "Storage__Provider"
        value = "Azure"
      }

      env {
        name        = "Storage__Azure__ConnectionString"
        secret_name = "blob-connection-string"
      }

      env {
        name  = "Storage__Azure__ContainerName"
        value = azurerm_storage_container.uploads.name
      }

      env {
        name  = "Storage__Azure__CdnUrl"
        value = var.blob_cdn_url
      }

      env {
        name        = "Ocr__Mistral__ApiKey"
        secret_name = "ocr-mistral-api-key"
      }

      env {
        name        = "Ocr__OpenRouter__ApiKey"
        secret_name = "ocr-openrouter-api-key"
      }

      env {
        name        = "Jwt__Key"
        secret_name = "jwt-key"
      }

      env {
        name        = "Jwt__RefreshKey"
        secret_name = "jwt-refresh-key"
      }

      env {
        name        = "Encryption__Key"
        secret_name = "encryption-key"
      }

      env {
        name        = "Turnstile__SecretKey"
        secret_name = "turnstile-secret-key"
      }

      env {
        name        = "Google__ClientId"
        secret_name = "google-client-id"
      }

      env {
        name        = "Google__ClientSecret"
        secret_name = "google-client-secret"
      }

      env {
        name  = "Email__FromAddress"
        value = trimspace(var.email_from_address)
      }

      env {
        name  = "Email__FromName"
        value = trimspace(var.email_from_name)
      }

      env {
        name  = "Email__Provider"
        value = var.email_provider
      }

      env {
        name  = "Email__Resend__BaseUrl"
        value = var.email_resend_base_url
      }

      env {
        name        = "Email__Resend__ApiKey"
        secret_name = "email-resend-api-key"
      }

      env {
        name  = "Email__Smtp__Host"
        value = var.email_smtp_host
      }

      env {
        name  = "Email__Smtp__Port"
        value = tostring(var.email_smtp_port)
      }

      env {
        name  = "Email__Smtp__EnableSsl"
        value = tostring(var.email_smtp_enable_ssl)
      }

      env {
        name        = "Email__Smtp__Username"
        secret_name = "email-smtp-username"
      }

      env {
        name        = "Email__Smtp__Password"
        secret_name = "email-smtp-password"
      }

      env {
        name  = "Seed__Admin__Email"
        value = var.seed_admin_email
      }

      env {
        name        = "Seed__Admin__Password"
        secret_name = "seed-admin-password"
      }

      env {
        name  = "Redis__Enabled"
        value = tostring(var.redis_enabled)
      }

      env {
        name        = "Redis__ConnectionString"
        secret_name = "redis-connection-string"
      }

      env {
        name  = "Redis__InstanceName"
        value = var.redis_instance_name
      }

      dynamic "env" {
        for_each = { for index, origin in local.cors_allowed_origins : index => origin }
        content {
          name  = "Cors__AllowedOrigins__${env.key}"
          value = env.value
        }
      }
    }
  }
}

resource "azurerm_container_app_custom_domain" "api" {
  count = var.api_custom_domain != "" ? 1 : 0

  name             = var.api_custom_domain
  container_app_id = azurerm_container_app.api.id

  lifecycle {
    ignore_changes = [certificate_binding_type, container_app_environment_certificate_id]
  }
}
