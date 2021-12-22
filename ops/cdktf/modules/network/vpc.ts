import { Resource , TerraformOutput, TerraformProvider} from "cdktf";
import { Construct } from "constructs";
import {  GoogleComputeNetwork } from '../../providers/google-beta';

interface VPCOptions {
    provider: TerraformProvider;
    name: string;
}

export class VPC extends Resource {
    private vpc: GoogleComputeNetwork;

    constructor(scope: Construct, id: string, {provider, name}: VPCOptions) {
        super(scope, id);
        this.vpc = new GoogleComputeNetwork(this, 'network', {
            name: name,
            autoCreateSubnetworks: false,
            provider: provider
        });
        new TerraformOutput(this, 'name', {
            value: this.vpc.name
        })
    }

    public getId() {
        return this.vpc.id;
    }
}