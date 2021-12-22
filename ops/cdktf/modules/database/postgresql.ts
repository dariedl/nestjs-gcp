import { Resource, TerraformProvider } from "cdktf";
import { Construct } from "constructs";
import { GoogleComputeGlobalAddress, GoogleServiceNetworkingConnection, GoogleSqlDatabaseInstance, GoogleSqlUser } from '../../providers/google-beta';

interface DatabaseOptions {
    provider: TerraformProvider;
    networkId: string;
}

export class Database extends Resource {

    constructor(scope: Construct, id: string, { networkId, provider }: DatabaseOptions) {
        super(scope, id);
        const privateIpAddress = new GoogleComputeGlobalAddress(this, "private_ip_address", {
            addressType: "INTERNAL",
            name: "private-ip-address",
            network: networkId,
            prefixLength: 16,
            purpose: "VPC_PEERING",
            provider
        });
        const googleServiceNetworkingConnectionPrivateVpcConnection =
            new GoogleServiceNetworkingConnection(this, "private_vpc_connection", {
                network: networkId,
                reservedPeeringRanges: [privateIpAddress.name],
                service: "servicenetworking.googleapis.com",
            });
        
        const dbInstance = new GoogleSqlDatabaseInstance(
            this,
            "master",
            {
                databaseVersion: "POSTGRES_11",
                deletionProtection: false,
                dependsOn: [
                    // @ts-ignore
                    `\${${ googleServiceNetworkingConnectionPrivateVpcConnection.fqn }}`,
                ],
                name: "nestjs-instance",
                region: "europe-west3",
                settings: {
                    ipConfiguration: {
                        ipv4Enabled: false,
                        privateNetwork: networkId,
                    },
                    tier: "db-f1-micro",
                },
                provider
            }
        );

        new GoogleSqlUser(this, "users", {
            instance: dbInstance.name,
            name: "me",
            password: this.randomString(),
            provider
          });
    }

    private randomString(): string {
        return Buffer.from(Math.random().toString()).toString("base64").substr(10, 10);
    }
}