export type CreateBucketHandler = (
	name: string,
	options?: {
		public?: boolean;
	},
) => Promise<void>;

export type GetSignedUploadUrlHandler = (
	path: string,
	options: {
		bucket: string;
	},
) => Promise<string>;

export type GetSignedUrlHander = (
	path: string,
	options: {
		bucket: string;
		expiresIn?: number;
	},
) => Promise<string>;

export type UploadBufferHandler = (
	path: string,
	buffer: Buffer,
	options: {
		bucket: string;
		contentType: string;
	},
) => Promise<void>;

export type DeleteObjectHandler = (
	path: string,
	options: {
		bucket: string;
	},
) => Promise<void>;

export type ListObjectsHandler = (options: {
	bucket: string;
	prefix?: string;
}) => Promise<Array<{ key: string; size: number; lastModified: Date }>>;
