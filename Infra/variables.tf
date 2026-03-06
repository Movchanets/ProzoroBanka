variable "project_name" {
  type        = string
  default     = "prozoro-banka"
  description = "Project name prefix for all resources"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment (dev, staging, prod)"
}

variable "location" {
  type        = string
  default     = "westeurope"
  description = "Azure region"
}

variable "api_image" {
  type        = string
  default     = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
  description = "Docker image for the API container"
}

variable "tags" {
  type = map(string)
  default = {
    project     = "ProzoroBanka"
    environment = "dev"
    managed_by  = "terraform"
  }
}
