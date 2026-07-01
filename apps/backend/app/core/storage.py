"""S3/MinIO object storage helpers (presigned uploads + public URLs).

Media bytes never pass through the API: admins request a presigned PUT URL, upload directly to
MinIO/S3, then store the resulting public URL on the content item.
"""

from __future__ import annotations

from functools import lru_cache

import boto3
from botocore.client import Config

from .settings import get_settings


@lru_cache
def _client() -> object:
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def create_presigned_upload(key: str, *, content_type: str, expires_in: int = 3600) -> str:
    """Return a presigned PUT URL to upload an object at ``key`` (no network I/O)."""
    settings = get_settings()
    return _client().generate_presigned_url(  # type: ignore[attr-defined]
        "put_object",
        Params={"Bucket": settings.s3_bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )


def public_url(key: str) -> str:
    """The stable public URL for an uploaded object."""
    settings = get_settings()
    return f"{settings.s3_endpoint.rstrip('/')}/{settings.s3_bucket}/{key}"
