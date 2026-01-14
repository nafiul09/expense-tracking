import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@repo/logs";
import type {
	DeleteObjectHandler,
	GetSignedUploadUrlHandler,
	GetSignedUrlHander,
	ListObjectsHandler,
	UploadBufferHandler,
} from "../../types";

let s3Client: S3Client | null = null;

const getS3Client = () => {
	if (s3Client) {
		return s3Client;
	}

	const s3Endpoint = process.env.S3_ENDPOINT as string;
	if (!s3Endpoint) {
		throw new Error("Missing env variable S3_ENDPOINT");
	}

	const s3Region = (process.env.S3_REGION as string) || "auto";

	const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID as string;
	if (!s3AccessKeyId) {
		throw new Error("Missing env variable S3_ACCESS_KEY_ID");
	}

	const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY as string;
	if (!s3SecretAccessKey) {
		throw new Error("Missing env variable S3_SECRET_ACCESS_KEY");
	}

	s3Client = new S3Client({
		region: s3Region,
		endpoint: s3Endpoint,
		forcePathStyle: true,
		credentials: {
			accessKeyId: s3AccessKeyId,
			secretAccessKey: s3SecretAccessKey,
		},
	});

	return s3Client;
};

export const getSignedUploadUrl: GetSignedUploadUrlHandler = async (
	path,
	{ bucket },
) => {
	const s3Client = getS3Client();
	try {
		// Detect content type from file extension
		let contentType = "image/png";
		if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
			contentType = "image/jpeg";
		} else if (path.endsWith(".webp")) {
			contentType = "image/webp";
		} else if (path.endsWith(".png")) {
			contentType = "image/png";
		}

		return await getS3SignedUrl(
			s3Client,
			new PutObjectCommand({
				Bucket: bucket,
				Key: path,
				ContentType: contentType,
			}),
			{
				expiresIn: 60,
			},
		);
	} catch (e) {
		logger.error(e);

		throw new Error("Could not get signed upload url");
	}
};

export const getSignedUrl: GetSignedUrlHander = async (
	path,
	{ bucket, expiresIn },
) => {
	const s3Client = getS3Client();
	try {
		return getS3SignedUrl(
			s3Client,
			new GetObjectCommand({ Bucket: bucket, Key: path }),
			{ expiresIn },
		);
	} catch (e) {
		logger.error(e);
		throw new Error("Could not get signed url");
	}
};

export const uploadBuffer: UploadBufferHandler = async (
	path,
	buffer,
	{ bucket, contentType },
) => {
	const s3Client = getS3Client();
	try {
		await s3Client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: path,
				Body: buffer,
				ContentType: contentType,
			}),
		);
	} catch (e) {
		logger.error(e);
		throw new Error("Could not upload buffer to S3");
	}
};

export const deleteObject: DeleteObjectHandler = async (path, { bucket }) => {
	const s3Client = getS3Client();
	try {
		await s3Client.send(
			new DeleteObjectCommand({
				Bucket: bucket,
				Key: path,
			}),
		);
	} catch (e) {
		logger.error(e);
		throw new Error("Could not delete object from S3");
	}
};

export const listObjects: ListObjectsHandler = async ({ bucket, prefix }) => {
	const s3Client = getS3Client();
	try {
		const command = new ListObjectsV2Command({
			Bucket: bucket,
			Prefix: prefix,
		});

		const response = await s3Client.send(command);

		return (response.Contents || []).map((obj) => ({
			key: obj.Key || "",
			size: obj.Size || 0,
			lastModified: obj.LastModified || new Date(),
		}));
	} catch (e) {
		logger.error(e);
		throw new Error("Could not list objects from S3");
	}
};
