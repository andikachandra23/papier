"""kirim.email API integration for subscriber list management.

Based on kirim.email API v3 docs:
https://documenter.getpostman.com/view/23706886/2s83zduQge

Authentication:
  Auth-Token = HMAC-SHA256(api_key, "{auth_id}::{api_key}::{timestamp}")
  Headers: Auth-Id, Auth-Token, Timestamp
  Content-Type: application/x-www-form-urlencoded
"""
import hashlib
import hmac
import logging
import time
import httpx
from ..config import env

logger = logging.getLogger(__name__)

KIRIM_EMAIL_AUTH_ID = env("KIRIM_EMAIL_AUTH_ID", "")
KIRIM_EMAIL_API_KEY = env("KIRIM_EMAIL_API_KEY", "")
KIRIM_EMAIL_LIST_ID = env("KIRIM_EMAIL_LIST_ID", "")
KIRIM_EMAIL_BASE_URL = "https://api.kirim.email/v3"


def _generate_auth_headers() -> dict:
    """
    Generate authentication headers for kirim.email API.
    Auth-Token is HMAC-SHA256 of "{auth_id}::{api_key}::{timestamp}" using api_key as the key.
    """
    timestamp = str(int(time.time()))
    message = f"{KIRIM_EMAIL_AUTH_ID}::{KIRIM_EMAIL_API_KEY}::{timestamp}"
    generated_token = hmac.new(
        KIRIM_EMAIL_API_KEY.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    return {
        "Auth-Id": KIRIM_EMAIL_AUTH_ID,
        "Auth-Token": generated_token,
        "Timestamp": timestamp,
    }


async def subscribe(email: str, name: str = "") -> dict:
    """
    Subscribe an email to the kirim.email mailing list.
    This is called as fire-and-forget — errors are logged but not raised.

    Uses kirim.email API v3:
    POST https://api.kirim.email/v3/subscriber/
    Headers: Auth-Id, Auth-Token (HMAC-SHA256), Timestamp
    Body: application/x-www-form-urlencoded

    Args:
        email: Subscriber email address
        name: Subscriber full name (optional)

    Returns:
        API response dict or error dict
    """
    if not KIRIM_EMAIL_AUTH_ID or not KIRIM_EMAIL_API_KEY or not KIRIM_EMAIL_LIST_ID:
        logger.warning("kirim.email credentials or List ID not configured, skipping subscribe.")
        return {"status": "skipped", "reason": "not_configured"}

    try:
        # Build form-urlencoded payload
        form_data = {
            "lists": KIRIM_EMAIL_LIST_ID,
            "email": email,
        }
        if name:
            form_data["full_name"] = name

        headers = _generate_auth_headers()
        headers["Content-Type"] = "application/x-www-form-urlencoded"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{KIRIM_EMAIL_BASE_URL}/subscriber/",
                data=form_data,
                headers=headers,
            )

            if response.status_code in (200, 201):
                logger.info(f"Successfully subscribed {email} to kirim.email list.")
                return {"status": "success", "data": response.json()}
            else:
                resp_data = response.json() if response.content else {}
                error_msg = resp_data.get("message", resp_data.get("error", ""))
                logger.info(
                    f"kirim.email subscribe response for {email}: "
                    f"status={response.status_code}, message={error_msg}"
                )
                return {"status": "api_error", "code": response.status_code, "detail": resp_data}

    except httpx.TimeoutException:
        logger.error(f"Timeout subscribing {email} to kirim.email.")
        return {"status": "timeout"}
    except Exception as e:
        logger.error(f"Error subscribing {email} to kirim.email: {e}")
        return {"status": "error", "detail": str(e)}


async def get_lists() -> dict:
    """
    Get all mailing lists from kirim.email.
    Useful to retrieve List IDs.

    GET https://api.kirim.email/v3/list
    """
    if not KIRIM_EMAIL_AUTH_ID or not KIRIM_EMAIL_API_KEY:
        return {"status": "skipped", "reason": "not_configured"}

    try:
        headers = _generate_auth_headers()

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{KIRIM_EMAIL_BASE_URL}/list",
                headers=headers,
            )
            return response.json()

    except Exception as e:
        logger.error(f"Error fetching kirim.email lists: {e}")
        return {"status": "error", "detail": str(e)}
