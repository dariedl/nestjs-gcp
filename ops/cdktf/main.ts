import { Construct } from "constructs";
import { App, TerraformStack, GcsBackend } from "cdktf";
import { GoogleArtifactRegistryRepository, GoogleBetaProvider } from './.gen/providers/google-beta';
import {VPC} from './modules/network/vpc';
import { Database } from "./modules/database/postgresql";
import { NestJsMain } from "./modules/cloudrun/nestjsMain";

class MyStack extends TerraformStack {

  constructor(scope: Construct, id: string) {
    super(scope, id);
    const projectId = 'just-experience-335708'

    new GcsBackend(this, {
      bucket: "cdktf-lab-terraform-state-01",
      prefix: "terraform/state",
    });
    
    const provider = new GoogleBetaProvider(this, 'google', {      
      region: 'europe-west1',    
      zone: 'europe-west1-a',
      project: projectId,
    });

    const vpc = new VPC(this, 'vpc', {
      name:  "cdktf-test", 
      provider});
    const {vpcId, vpcConnectorName} = vpc.getConfig();
    const db = new Database(this, 'db', {vpcId, provider});
    const {connectionString, user} = db.getConfig()

    new GoogleArtifactRegistryRepository(this, "nestjs-repo", {
      description: "example docker repository",
      format: "DOCKER",
      location: "europe-west3",
      repositoryId: "nestjs-gcp",
      provider
    });

    new NestJsMain(this, 'nestjs', {
      provider,
      vpcConnectorName,
      sqlUser: user,
      dbConnectionUrl: connectionString,
      projectId
    })
  }
}
const app = new App();
new MyStack(app, "cdktf-test-google");
app.synth();
