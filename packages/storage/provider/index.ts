/**
 * Storage Provider Configuration
 *
 * For Supabase Storage:
 * - Supabase storage is S3-compatible, so we use the S3 provider
 * - Set S3_ENDPOINT to your Supabase storage endpoint
 * - Get S3 access keys from Supabase dashboard
 *
 * For other S3-compatible storage (AWS S3, Cloudflare R2, etc.):
 * - Use the same S3 provider with appropriate endpoint
 */

export * from "./s3";
