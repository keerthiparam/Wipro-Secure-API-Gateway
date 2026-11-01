
import os

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")

if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError(
        "Set JWT_SECRET_KEY to a random secret of at least 32 characters"
    )

JWT_ALGORITHM = "HS256"
JWT_ISSUER = "nms-secure-api-gateway"
JWT_AUDIENCE = "nms-api"
JWT_EXPIRY_SECONDS = 900  # 15 minutes
ACCESS_TOKEN_EXPIRES_IN = JWT_EXPIRY_SECONDS

CLIENT_ID = os.environ.get("OAUTH_CLIENT_ID")
CLIENT_SECRET = os.environ.get("OAUTH_CLIENT_SECRET")

if not CLIENT_ID or not CLIENT_SECRET:
    raise RuntimeError(
        "Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET"
    )
