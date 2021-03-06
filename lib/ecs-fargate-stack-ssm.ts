import { App, Stack, StackProps, CfnOutput } from '@aws-cdk/core';
import { Vpc } from "@aws-cdk/aws-ec2";
import { Cluster, ContainerImage, Secret as ECSSecret } from "@aws-cdk/aws-ecs";
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import { Secret } from '@aws-cdk/aws-secretsmanager';

//SSM Parameter imports
import { SecretValue } from '@aws-cdk/core';
import { StringParameter, ParameterTier } from "@aws-cdk/aws-ssm";

export interface ECSStackProps extends StackProps {
    vpc: Vpc
    dbSecretArn: string
}

export class ECSStack extends Stack {

    constructor(scope: App, id: string, props: ECSStackProps) {
        super(scope, id, props);

        const containerPort = this.node.tryGetContext("containerPort");
        const containerImage = this.node.tryGetContext("containerImage");
        const creds = Secret.fromSecretCompleteArn(this, 'postgresCreds', props.dbSecretArn);

        //fetch existing parameter from parameter store securely
        const DEMOPARAM = StringParameter.fromSecureStringParameterAttributes(this, 'demo_param', {
            parameterName: 'DEMO_PARAMETER',
            version: 1
        });

        const cluster = new Cluster(this, 'Cluster', {
            vpc: props.vpc,
            clusterName: 'fargateClusterDemo'
        });

        const fargateService = new ApplicationLoadBalancedFargateService(this, "fargateService", {
            cluster,
            taskImageOptions: {
                image: ContainerImage.fromRegistry(containerImage),
                containerPort: containerPort,
                enableLogging: true,
                secrets: {
                    POSTGRES_DATA: ECSSecret.fromSecretsManager(creds),
                    //Inject parameters value securely
                    DEMO_PARAMETER: ECSSecret.fromSsmParameter(DEMOPARAM),
                },
            },
            desiredCount: 1,
            publicLoadBalancer: true,
            serviceName: 'fargateServiceDemo'
        });

        new CfnOutput(this, 'LoadBalancerDNS', { value: fargateService.loadBalancer.loadBalancerDnsName });
    }
}