from __future__ import annotations

import os
from typing import BinaryIO, Iterator, Optional

import boto3
from botocore.client import Config
from .config import env


R2_PREFIX = "r2://"


def r2_enabled() -> bool:
    return all(
        env(name)
        for name in [
            "R2_ACCOUNT_ID",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
            "R2_BUCKET_NAME",
        ]
    )


def is_r2_path(path: Optional[str]) -> bool:
    return bool(path and path.startswith(R2_PREFIX))


def r2_key(path: str) -> str:
    if not is_r2_path(path):
        raise ValueError("Not an R2 path")
    return path[len(R2_PREFIX):]


def to_r2_path(key: str) -> str:
    return f"{R2_PREFIX}{key}"


def get_r2_client():
    account_id = env("R2_ACCOUNT_ID")
    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=env("R2_SECRET_ACCESS_KEY"),
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_pdf_to_r2(file_obj: BinaryIO, key: str) -> str:
    client = get_r2_client()
    client.upload_fileobj(
        file_obj,
        env("R2_BUCKET_NAME"),
        key,
        ExtraArgs={
            "ContentType": "application/pdf",
        },
    )
    return to_r2_path(key)


def stream_r2_object(path: str, chunk_size: int = 8192) -> Iterator[bytes]:
    client = get_r2_client()
    obj = client.get_object(Bucket=env("R2_BUCKET_NAME"), Key=r2_key(path))
    body = obj["Body"]
    try:
        while chunk := body.read(chunk_size):
            yield chunk
    finally:
        body.close()


def delete_r2_object(path: str) -> None:
    if not is_r2_path(path):
        return
    client = get_r2_client()
    client.delete_object(Bucket=env("R2_BUCKET_NAME"), Key=r2_key(path))