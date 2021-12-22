import { Resource, TerraformProvider, TerraformResource } from "cdktf";
import { Construct } from "constructs";
import { DataGoogleIamPolicy, GoogleCloudRunService, GoogleCloudRunServiceIamPolicy } from "../../.gen/providers/google-beta";

interface NestJsMainOptions {
    provider: TerraformProvider;
    sqlUser: TerraformResource;
    vpcConnectorName: string
    dbConnectionUrl: string
    projectId: string
}

export class NestJsMain extends Resource {

    constructor(scope: Construct, id: string, { provider, sqlUser, vpcConnectorName, dbConnectionUrl, projectId }: NestJsMainOptions) {
        super(scope, id);
        const cloudRunService = new GoogleCloudRunService(
            this,
            "cdktf-service",
            {
                autogenerateRevisionName: true,
                provider: provider,
                // @ts-ignore
                dependsOn: [`\${${sqlUser.fqn}}`],
                location: "europe-west3",
                name: "cdktf-service",
                template: {
                    metadata: {
                        annotations: 
                            {
                                autoscalingKnativeDevMaxScale: "1",
                                runGoogleapisComVpcAccessConnector: vpcConnectorName,
                                runGoogleapisComVpcAccessEgress: "all",
                            },
                    },
                    spec: {
                        containers: [
                            {
                                env: [
                                    {
                                        name: "DATABASE_URL",
                                        value: dbConnectionUrl,
                                    },
                                ],
                                image:
                                    `europe-west3-docker.pkg.dev/${projectId}/nestjs-gcp/nestjs-gcp-app:latest`,
                                resources: {
                                    limits: 
                                        {
                                            cpu: "1000m",
                                            memory: "512M",
                                        },
                                },
                            },
                        ],
                    },
                },
            }
        );

        const iamPolicyNoauth = new DataGoogleIamPolicy(
            this,
            "noauth",
            {
                binding: [
                    {
                        members: ["allUsers"],
                        role: "roles/run.invoker",
                    },
                ],
            }
        );

        const cloudRunServiceIamPolicyNoauth =
            new GoogleCloudRunServiceIamPolicy(this, "noauth_12", {
                location: cloudRunService.location,
                policyData: iamPolicyNoauth.policyData,
                project: cloudRunService.project,
                service: cloudRunService.name,
            });
        /*This allows the Terraform resource name to match the original name. You can remove the call if you don't need them to match.*/
        cloudRunServiceIamPolicyNoauth.overrideLogicalId("noauth");
    }

}