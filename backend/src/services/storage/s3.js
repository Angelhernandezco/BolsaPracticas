import { S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand } from '@aws-sdk/client-s3';
export function s3Storage(config,client=new S3Client({region:config.awsRegion})) {
  function input(key){if(!config.s3Bucket || !config.awsRegion)throw new Error('Configura S3_BUCKET y AWS_REGION.');return {Bucket:config.s3Bucket,Key:key};}
  return {
    async put({key,buffer,contentType}) {await client.send(new PutObjectCommand({...input(key),Body:buffer,ContentType:contentType}));},
    async get({key}) {const result=await client.send(new GetObjectCommand(input(key)));return {stream:result.Body};},
    async delete({key}) {await client.send(new DeleteObjectCommand(input(key)));}
  };
}
