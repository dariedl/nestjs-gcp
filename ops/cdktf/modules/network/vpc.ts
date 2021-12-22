import { Resource , TerraformOutput, TerraformProvider} from "cdktf";
import { Construct } from "constructs";
import { GoogleProjectService, GoogleVpcAccessConnector } from "../../.gen/providers/google-beta";
import { GoogleComputeNetwork } from '../../.gen/providers/google-beta';

interface VPCOptions {
    provider: TerraformProvider;
    name: string;
}

export class VPC extends Resource {
    private vpcId: string;
    private vpcConnectorName: string;

    constructor(scope: Construct, id: string, {provider, name}: VPCOptions) {
        super(scope, id);
        const vpc = new GoogleComputeNetwork(this, 'network', {
            name: name,
            autoCreateSubnetworks: false,
            provider: provider
        });
        this.vpcId = vpc.id;

        const projectServiceAccessApi = new GoogleProjectService(
            this,
            "vpcaccess_api",
            {
              disableOnDestroy: false,
              service: "vpcaccess.googleapis.com",
              provider
            }
          );

          const vpcAccessConnector = new GoogleVpcAccessConnector(
            this,
            "connector",
            {
                // @ts-ignore
              dependsOn: [`\${${projectServiceAccessApi.fqn}}`],
              ipCidrRange: "10.8.0.0/28",
              name: "lab-vpc-con",
              network: name,
              provider
            }
          );
          this.vpcConnectorName = vpcAccessConnector.name;
        new TerraformOutput(this, 'name', {
            value: vpc.name
        })
    }

    public getConfig() {
        return {
            vpcId: this.vpcId,
            vpcConnectorName: this.vpcConnectorName
        }
    }
}