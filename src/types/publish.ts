export interface PublishFileInput {
  path: string;
  hash: string;
  size: number;
  contentType: string;
}

export interface PublishRequest {
  files: PublishFileInput[];
  metadata?: {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
}

export interface UploadInfo {
  token: string;
  hash: string;
  path: string;
  uploadUrl: string;
}

export interface PublishResponse {
  slug: string;
  siteUrl: string;
  uploads: UploadInfo[];
  skipped: string[];
  claimToken?: string;
  claimUrl?: string;
  status: string;
  isLive: boolean;
  requiresFinalize: boolean;
  versionNumber: number;
}

export interface SiteFileResponse {
  path: string;
  hash: string;
  size: number;
  contentType: string;
}

export interface SiteResponse {
  id: string;
  slug: string;
  status: string;
  siteUrl: string;
  metadata: Record<string, unknown>;
  hasPassword: boolean;
  ttl: number | null;
  currentVersion: {
    versionNumber: number;
    status: string;
    isLive: boolean;
    files: SiteFileResponse[];
    createdAt: number;
    finalizedAt: number | null;
  } | null;
  createdAt: number;
  updatedAt: number;
}

export interface SiteListResponse {
  sites: SiteResponse[];
  limit: number;
  offset: number;
  count: number;
}
