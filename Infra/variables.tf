variable "project_name" {
  type        = string
  default     = "prozoro-banka"
  description = "Base project name used for Azure resource names."
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Deployment environment name."
}

variable "location" {
  type        = string
  default     = "polandcentral"
  description = "Azure region for all resources."
}

variable "container_apps_location" {
  type        = string
  default     = ""
  description = "Optional override for Azure Container Apps environment region when the main location has capacity issues."
}

variable "resource_group_name" {
  type        = string
  default     = ""
  description = "Optional override for the resource group name."
}

variable "container_app_environment_name" {
  type        = string
  default     = ""
  description = "Optional override for the Container Apps environment name."
}

variable "api_container_app_name" {
  type        = string
  default     = ""
  description = "Optional override for the backend Container App name."
}

variable "static_web_app_name" {
  type        = string
  default     = ""
  description = "Optional override for the Static Web App name."
}

variable "static_web_app_custom_domain" {
  type        = string
  default     = ""
  description = "Optional custom domain for Azure Static Web Apps, for example prozoroapp.pp.ua."
}

variable "static_web_app_custom_domain_validation_type" {
  type        = string
  default     = "cname-delegation"
  description = "Validation type for the Static Web App custom domain. Use cname-delegation for subdomains managed in external DNS."
}

variable "static_web_app_root_custom_domain" {
  type        = string
  default     = "prozorobanka.pp.ua"
  description = "Optional root (apex) custom domain for Azure Static Web Apps."
}

variable "static_web_app_root_custom_domain_validation_type" {
  type        = string
  default     = "dns-txt-token"
  description = "Validation type for the Static Web App root custom domain. Use dns-txt-token for apex domains."
}

variable "api_custom_domain" {
  type        = string
  default     = ""
  description = "Optional custom domain for API Container App, for example api.prozorobanka.pp.ua."
}


variable "storage_account_name" {
  type        = string
  default     = ""
  description = "Optional override for the Blob Storage account name. Must be globally unique."
}

variable "storage_container_name" {
  type        = string
  default     = "uploads"
  description = "Azure Blob container name used by the backend file storage provider."
}

variable "api_image" {
  type        = string
  default     = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
  description = "Full container image reference for the backend API."
}

variable "github_registry_server" {
  type        = string
  default     = "ghcr.io"
  description = "Container registry server used by Azure Container Apps."
}

variable "github_registry_username" {
  type        = string
  default     = ""
  description = "Username with read access to the GHCR package."
}

variable "github_registry_password" {
  type        = string
  sensitive   = true
  description = "Token or PAT with read access to the GHCR package."
}

variable "container_cpu" {
  type        = number
  default     = 0.5
  description = "CPU allocation for the backend container."
}

variable "container_memory" {
  type        = string
  default     = "1Gi"
  description = "Memory allocation for the backend container."
}

variable "container_min_replicas" {
  type        = number
  default     = 0
  description = "Minimum number of backend replicas."
}

variable "container_max_replicas" {
  type        = number
  default     = 2
  description = "Maximum number of backend replicas."
}

variable "database_connection_string" {
  type        = string
  sensitive   = true
  description = "Primary PostgreSQL connection string for the backend."
}

variable "jwt_key" {
  type        = string
  sensitive   = true
  description = "JWT signing key."
}

variable "jwt_refresh_key" {
  type        = string
  sensitive   = true
  description = "JWT refresh token signing key."
}

variable "encryption_key" {
  type        = string
  sensitive   = true
  description = "Application encryption key."
}

variable "turnstile_secret_key" {
  type        = string
  sensitive   = true
  description = "Cloudflare Turnstile secret key for backend verification."
}

variable "auth_cookies_domain" {
  type        = string
  default     = ""
  description = "Domain attribute for authentication and CSRF cookies (e.g. .prozorobanka.pp.ua)."
}

variable "google_client_id" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Google OAuth client identifier."
}

variable "google_client_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Google OAuth client secret."
}

variable "email_from_address" {
  type        = string
  default     = "noreply@example.com"
  description = "Email sender address used by the backend."
}

variable "email_from_name" {
  type        = string
  default     = "ProzoroBanka"
  description = "Email sender display name used by the backend."
}

variable "email_provider" {
  type        = string
  default     = "smtp"
  description = "Email provider used by the backend (smtp|resend)."
}

variable "email_resend_base_url" {
  type        = string
  default     = "https://api.resend.com/"
  description = "Resend API base URL."
}

variable "email_resend_api_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Resend API key."
}

variable "email_smtp_host" {
  type        = string
  default     = "smtp.gmail.com"
  description = "SMTP host used by the backend."
}

variable "email_smtp_port" {
  type        = number
  default     = 587
  description = "SMTP port used by the backend."
}

variable "email_smtp_enable_ssl" {
  type        = bool
  default     = true
  description = "Whether the SMTP server requires SSL."
}

variable "email_smtp_username" {
  type        = string
  default     = ""
  sensitive   = true
  description = "SMTP username."
}

variable "email_smtp_password" {
  type        = string
  default     = ""
  sensitive   = true
  description = "SMTP password."
}

variable "seed_admin_email" {
  type        = string
  default     = "admin@example.com"
  description = "Seed administrator email used during environment bootstrap."
}

variable "seed_admin_password" {
  type        = string
  sensitive   = true
  description = "Seed administrator password used during environment bootstrap."
}

variable "ocr_mistral_api_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Mistral OCR API key."
}

variable "ocr_openrouter_api_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "OpenRouter OCR API key."
}

variable "redis_enabled" {
  type        = bool
  default     = false
  description = "Enable Redis support in the backend application."
}

variable "redis_connection_string" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Redis connection string when Redis is enabled."
}

variable "redis_instance_name" {
  type        = string
  default     = "ProzoroBanka:"
  description = "Redis key prefix used by the backend."
}

variable "blob_cdn_url" {
  type        = string
  default     = ""
  description = "Optional CDN URL in front of the Blob container."
}

variable "additional_cors_allowed_origins" {
  type        = list(string)
  default     = []
  description = "Additional origins to allow alongside the Static Web App hostname."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags applied to all Azure resources."
}
