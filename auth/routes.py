import hmac

from flask import Blueprint, jsonify, request

from .config import CLIENT_ID, CLIENT_SECRET
from .jwt_handler import create_access_token, validate_access_token


auth_bp = Blueprint("auth", __name__)


def credentials_are_valid(client_id, client_secret):
    """Check whether the supplied client credentials are correct."""

    if not CLIENT_ID or not CLIENT_SECRET:
        return False

    if not client_id or not client_secret:
        return False

    return (
        hmac.compare_digest(client_id, CLIENT_ID)
        and hmac.compare_digest(client_secret, CLIENT_SECRET)
    )


@auth_bp.route("/oauth/token", methods=["POST"])
def issue_token():
    """OAuth2 client credentials token endpoint."""

    # This implementation accepts form-encoded credentials
    # or HTTP Basic authentication.
    client_id = None
    client_secret = None

    if request.authorization:
        client_id = request.authorization.username
        client_secret = request.authorization.password

    if not client_id or not client_secret:
        client_id = request.form.get("client_id")
        client_secret = request.form.get("client_secret")

    grant_type = request.form.get("grant_type", "client_credentials")

    if grant_type != "client_credentials":
        return jsonify({
            "error": "unsupported_grant_type"
        }), 400

    if not credentials_are_valid(client_id, client_secret):
        return jsonify({
            "error": "invalid_client"
        }), 401

    try:
        token = create_access_token(client_id)
    except RuntimeError:
        return jsonify({
            "error": "server_configuration_error"
        }), 500

    from .config import ACCESS_TOKEN_EXPIRES_IN

    return jsonify({
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_EXPIRES_IN,
    }), 200


@auth_bp.route("/internal/validate", methods=["GET"])
def validate_token_for_gateway():
    """Internal endpoint for NGINX auth_request."""

    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        return "", 401

    claims = validate_access_token(parts[1])

    if claims is None:
        return "", 401

    return "", 204
