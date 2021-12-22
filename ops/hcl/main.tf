locals {
  project_id   = "gcp-hcl-lab"
  network_name = "lab-tf-nw"
}

provider "google-beta" {
  project = local.project_id
  region  = "europe-west3"
  zone    = "europe-west3-a"
}

terraform {
  backend "gcs" {
    bucket = "gcp-lab-terraform-state-01"
    prefix = "terraform/state"
  }
}

resource "google_compute_network" "gcp-lab-terraform-network" {
  provider                = google-beta
  name                    = local.network_name
  auto_create_subnetworks = "true"
}

resource "google_compute_global_address" "private_ip_address" {
  provider = google-beta

  name          = "private-ip-address"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.gcp-lab-terraform-network.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  provider = google-beta

  network                 = google_compute_network.gcp-lab-terraform-network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

resource "google_sql_database_instance" "master" {
  provider = google-beta

  name                = "nestjs-instance"
  database_version    = "POSTGRES_11"
  region              = "europe-west3"
  deletion_protection = false

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.gcp-lab-terraform-network.id
    }
  }
}

resource "random_string" "random" {
  length           = 16
  special          = true
  override_special = "/@£$"
}

resource "google_sql_user" "users" {
  provider = google-beta

  name     = "me"
  instance = google_sql_database_instance.master.name
  password = random_string.random.id
}

resource "google_artifact_registry_repository" "nestjs-gcp" {
  provider = google-beta

  location      = "europe-west3"
  repository_id = "nestjs-gcp"
  description   = "example docker repository"
  format        = "DOCKER"
}

###################

resource "google_project_service" "vpcaccess_api" {
  service            = "vpcaccess.googleapis.com"
  provider           = google-beta
  disable_on_destroy = false
}

# is needed for cloud run to connect to DB instance
resource "google_vpc_access_connector" "connector" {
  provider      = google-beta
  name          = "lab-vpc-con"
  ip_cidr_range = "10.8.0.0/28"
  network       = local.network_name
  depends_on    = [google_project_service.vpcaccess_api]
}

# Cloud Run service
# resource "google_cloud_run_service" "gcr_service" {
#   name       = "mygcrservice"
#   provider   = google-beta
#   location   = "europe-west3"
#   depends_on = [google_sql_user.users]

#   template {
#     spec {
#       containers {
#         image = "europe-west3-docker.pkg.dev/${local.project_id}/nestjs-gcp/nestjs-gcp-app:latest"
#         resources {
#           limits = {
#             cpu    = "1000m"
#             memory = "512M"
#           }
#         }
#         env {
#           name  = "DATABASE_URL"
#           value = "postgresql://${google_sql_user.users.name}:${google_sql_user.users.password}@${google_sql_database_instance.master.private_ip_address}:5432/${google_sql_database_instance.master.name}"
#         }
#       }
#       # the service uses this SA to call other Google Cloud APIs
#       # service_account_name = myservice_runtime_sa
#     }

#     metadata {
#       annotations = {
#         # Limit scale up to prevent any cost blow outs!
#         "autoscaling.knative.dev/maxScale" = "1"
#         # Use the VPC Connector
#         "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.name
#         # all egress from the service should go through the VPC Connector
#         "run.googleapis.com/vpc-access-egress" = "all"
#       }
#     }
#   }
#   autogenerate_revision_name = true
# }


# # Create public access
# data "google_iam_policy" "noauth" {
#   binding {
#     role = "roles/run.invoker"
#     members = [
#       "allUsers",
#     ]
#   }
# }
# # Enable public access on Cloud Run service
# resource "google_cloud_run_service_iam_policy" "noauth" {
#   location    = google_cloud_run_service.gcr_service.location
#   project     = google_cloud_run_service.gcr_service.project
#   service     = google_cloud_run_service.gcr_service.name
#   policy_data = data.google_iam_policy.noauth.policy_data
# }
# # Return service URL
# output "url" {
#   value = google_cloud_run_service.gcr_service.status[0].url
# }
