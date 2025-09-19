# Cosmos PostgreSQL Bicep Module

This Bicep template provisions an Azure Cosmos DB for PostgreSQL (serverGroupsv2) cluster sized for the SaaS framework migration.

## Parameters
- 
amePrefix: Short identifier applied to all resources (<prefix>-cospg).
- dminLogin / dminPassword: Cluster administrator credentials.
- 
odeCount: Worker nodes (default 3, HA enabled).
- coordinatorSku / workerSku: Compute SKUs (default Standard_D8s_v5).
- coordinatorStorageGiB / workerStorageGiB: Storage allocations converted to MiB in the template.
- privateEndpointSubnetId: Optional; when provided the template creates a private endpoint bound to the coordinator.

## Usage
`ash
az deployment group create \
  --resource-group <rg-name> \
  --template-file infra/cosmos/main.bicep \
  --parameters namePrefix=primus adminLogin=cosadmin adminPassword=<secure> \
      nodeCount=3 coordinatorSku=Standard_D8s_v5 workerSku=Standard_D8s_v5
`

The outputs include the coordinator FQDN, worker FQDNs, and the default pp database name for connection string assembly.

> **Note:** API version 2023-06-01-preview is used for Cosmos DB for PostgreSQL. Validate against the target subscription for GA/LTS availability before production rollout.
