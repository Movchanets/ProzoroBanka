terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.26"
    }
  }

  backend "azurerm" {
    resource_group_name  = "filled_at_runtime"
    storage_account_name = "filled_at_runtime"
    container_name       = "filled_at_runtime"
    key                  = "filled_at_runtime"
  }
}

provider "azurerm" {
  features {}
}
