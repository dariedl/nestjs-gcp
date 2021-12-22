import { Resource, TerraformProvider } from "cdktf";
import { Construct } from "constructs";
import { GoogleSqlDatabase } from "../../.gen/providers/google-beta";
import { GoogleComputeGlobalAddress, GoogleServiceNetworkingConnection, GoogleSqlDatabaseInstance, GoogleSqlUser } from '../../.gen/providers/google-beta';

interface DatabaseOptions {
    provider: TerraformProvider;
    vpcId: string;
}

export class Database extends Resource {
    private username: string;
    private password: string;
    private ipAddress: string;
    private port: number = 5432;
    private dbName: string;
    private user: GoogleSqlUser;

    constructor(scope: Construct, id: string, { vpcId, provider }: DatabaseOptions) {
        super(scope, id);
        const privateIpAddress = new GoogleComputeGlobalAddress(this, "private_ip_address", {
            addressType: "INTERNAL",
            name: "private-ip-address",
            network: vpcId,
            prefixLength: 16,
            purpose: "VPC_PEERING",
            provider
        });
        this.ipAddress = privateIpAddress.address;

        const googleServiceNetworkingConnectionPrivateVpcConnection =
            new GoogleServiceNetworkingConnection(this, "private_vpc_connection", {
                network: vpcId,
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
                        privateNetwork: vpcId,
                    },
                    tier: "db-f1-micro",
                },
                provider
            }
        );

        this.user = new GoogleSqlUser(this, "users", {
            instance: dbInstance.name,
            name: "me",
            password: "aojuxnclq23wijr34IJsdlds",
            provider
          });
        this.username = this.user.name;
        this.password = this.user.password;

        const db = new GoogleSqlDatabase(this, "database", {
            name: 'my-nestjs-db',
            instance: dbInstance.name,
            provider
        });
        this.dbName = db.name;
    }

    public getConfig() {
        return {
            connectionString: this.getConnectionString(),
            user: this.user,
        }
    }

    private getConnectionString() {
        return `postgresql://${this.username}:${this.password}@${this.ipAddress}:${this.port}/${this.dbName}`
    }

    // private randomString(): string {
    //     return Buffer.from(Math.random().toString()).toString("base64").substr(10, 10);
    // }
}