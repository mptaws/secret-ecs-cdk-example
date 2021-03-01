import { App, Stack, StackProps } from '@aws-cdk/core';
import { Vpc } from "@aws-cdk/aws-ec2";
import { Cluster, ContainerImage, Secret as ECSSecret } from "@aws-cdk/aws-ecs";
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import { Secret } from '@aws-cdk/aws-secretsmanager';

export interface ECSStackProps extends StackProps {
  vpc: Vpc
  dbSecretArn: string
}

export class ECSStack extends Stack {

  constructor(scope: App, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const containerPort = this.node.tryGetContext("containerPort");
    const containerImage = this.node.tryGetContext("containerImage");
    const creds = Secret.fromSecretCompleteArn(this, 'pgcreds', props.dbSecretArn);

    const cluster = new Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'FargateClusterDemo'
    });

    const fargateService = new ApplicationLoadBalancedFargateService(this, "FargateService", {
      cluster,
      taskImageOptions: {
        image: ContainerImage.fromRegistry(containerImage),
        containerPort: containerPort,
        enableLogging: true,
        secrets: {
          POSTGRES_USER: ECSSecret.fromSecretsManager(creds!, 'username'),
          POSTGRES_PASS: ECSSecret.fromSecretsManager(creds!, 'password'),
          POSTGRES_HOST: ECSSecret.fromSecretsManager(creds!, 'host'),
          POSTGRES_PORT: ECSSecret.fromSecretsManager(creds!, 'port'),
          POSTGRES_NAME: ECSSecret.fromSecretsManager(creds!, 'dbname')
        }
      },
      desiredCount: 1,
      publicLoadBalancer: true,
      serviceName: 'FargateServiceDemo'
    });
  }
}