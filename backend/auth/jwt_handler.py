import time

import jwt
from jwt.exceptions import InvalidTokenError

from .config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    JWT_ISSUER,
    JWT_AUDIENCE,
    JWT_EXPIRY_SECONDS,
)


def create_access_token(client_id):
    """Generate a signed JWT access token."""

    now = int(time.time())

    payload = {
        "sub": client_id,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now,
        "exp": now + JWT_EXPIRY_SECONDS,
    }

    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    return token


def validate_access_token(token):
    """Validate the JWT and return its claims, or None if invalid."""

    if not token:
        return None

    try:
        claims = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={
                "require": ["sub", "iss", "aud", "iat", "exp"],
            },
        )

        return claims

    except InvalidTokenError:
        return None
