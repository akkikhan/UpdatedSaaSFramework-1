@description('Prefix applied to Cosmos DB for PostgreSQL resources (letters and numbers, 3-12 chars).')
param namePrefix string

@description('Azure region for deployment.')
param location string = resourceGroup().location

@description('Administrator login for the cluster.')
param adminLogin string

@description('Administrator password for the cluster.')
@secure()
param adminPassword string

@description('Number of worker nodes in the cluster (1-20).')
@minValue(1)
@maxValue(20)
param nodeCount int = 3

@description('Compute SKU for coordinator node (example: Standard_D8s_v5).')
param coordinatorSku string = 'Standard_D8s_v5'

@description('Compute SKU for worker nodes (example: Standard_D8s_v5).')
param workerSku string = 'Standard_D8s_v5'

@description('Coordinator storage quota in GiB.')
@minValue(64)
param coordinatorStorageGiB int = 512

@description('Worker storage quota in GiB.')
@minValue(64)
param workerStorageGiB int = 512

@description('Enable high availability for coordinator node.')
param coordinatorHa bool = true

@description('Enable high availability for worker nodes.')
param workerHa bool = true

@description('Tags applied to all resources.')
param tags object = {}

var serverGroupName = '${namePrefix}-cospg'
var coordinatorStorageMb = coordinatorStorageGiB * 1024
var workerStorageMb = workerStorageGiB * 1024

resource cosmosPg 'Microsoft.DBforPostgreSQL/serverGroupsv2@2023-03-02-preview' = {
  name: serverGroupName
  location: location
  tags: tags
  sku: {
    name: coordinatorSku
    tier: 'GeneralPurpose'
  }
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    coordinatorEnableHa: coordinatorHa
    coordinatorServerEdition: 'GeneralPurpose'
    coordinatorStorageQuotaInMb: coordinatorStorageMb
    citusVersion: '11.3'
    enableShardsOnCoordinator: true
    nodeCount: nodeCount
    nodeConfiguration: {
      enableHa: workerHa
      skuName: workerSku
      serverEdition: 'GeneralPurpose'
      storageQuotaInMb: workerStorageMb
    }
    nodeServerEdition: 'GeneralPurpose'
    publicNetworkAccess: 'Enabled'
    maintenanceWindow: {
      customWindow: false
    }
  }
}

resource coordinatorDb 'Microsoft.DBforPostgreSQL/serverGroupsv2/databases@2023-03-02-preview' = {
  name: '${cosmosPg.name}/app'
  properties: {
    collation: 'en_US.utf8'
    charset: 'UTF8'
  }
}

@description('Optional: Enable private endpoint by providing a subnet resource ID.')
param privateEndpointSubnetId string = ''

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = if (!empty(privateEndpointSubnetId)) {
  name: '${serverGroupName}-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: '${serverGroupName}-plsc'
        properties: {
          privateLinkServiceId: cosmosPg.id
          groupIds: [ 'coordinator' ]
          requestMessage: 'Requesting access to Cosmos DB for PostgreSQL coordinator endpoint.'
        }
      }
    ]
  }
}

output coordinatorHost string = cosmosPg.properties.coordinatorServerFullyQualifiedDomainName
output workerHosts array = cosmosPg.properties.nodeServerFullyQualifiedDomainNames
output databaseName string = coordinatorDb.name
