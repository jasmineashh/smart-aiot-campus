
import os
from getpass import getpass

import requests


class CampusApiClient:
    BASE_URL = "http://127.0.0.1:5200"
    TIMEOUT = 60

    def __init__(self, device_key=None):
        self.session = requests.Session()
        self.session.trust_env = False

        self.device_session = requests.Session()
        self.device_session.trust_env = False

        self.csrf_token = None
        self.admin_authenticated = False

        self.device_key = (
            device_key
            or os.getenv("DEVICE_KEY")
            or os.getenv("Security__DeviceApiKey")
        )

    def _request(self, method, path, device=False, **kwargs):
        if not path.startswith("/api/"):
            raise ValueError("Invalid API path.")

        headers = dict(kwargs.pop("headers", {}))

        if device:
            if not self.device_key:
                raise RuntimeError(
                    "Device API key is not configured."
                )

            headers["X-Device-Key"] = self.device_key

        kwargs.setdefault("timeout", self.TIMEOUT)
        kwargs["allow_redirects"] = False

        session = (
            self.device_session
            if device
            else self.session
        )

        response = session.request(
            method,
            f"{self.BASE_URL}{path}",
            headers=headers,
            **kwargs,
        )

        if not 200 <= response.status_code < 300:
            raise RuntimeError(
                f"{method} {path}: HTTP "
                f"{response.status_code}"
            )

        return response

    @staticmethod
    def _read_response(response):
        if not response.content:
            return None

        return response.json()

    def refresh_csrf_token(self):
        response = self._request(
            "GET",
            "/api/auth/csrf",
        )

        self.csrf_token = response.json().get(
            "requestToken"
        )

        if not self.csrf_token:
            raise RuntimeError(
                "The server did not return a CSRF token."
            )

    def login_admin(self, identifier, password):
        self.refresh_csrf_token()

        self._request(
            "POST",
            "/api/auth/login",
            json={
                "universityIdOrEmail": identifier,
                "password": password,
            },
            headers={
                "X-CSRF-TOKEN": self.csrf_token,
            },
        )

        user = self.get_current_user()

        if "Admin" not in user.get("roles", []):
            self.logout()

            raise PermissionError(
                "An administrator account is required."
            )

        self.refresh_csrf_token()
        self.admin_authenticated = True

        print("Administrator authentication successful.")

        return user

    def get_current_user(self):
        return self._request(
            "GET",
            "/api/auth/me",
        ).json()

    def admin_request(
        self,
        method,
        path,
        **kwargs,
    ):
        if not self.admin_authenticated:
            raise PermissionError(
                "Administrator login is required."
            )

        method = method.upper()

        headers = dict(
            kwargs.pop("headers", {})
        )

        if method not in ("GET", "HEAD", "OPTIONS"):
            self.refresh_csrf_token()

            headers["X-CSRF-TOKEN"] = (
                self.csrf_token
            )

        response = self._request(
            method,
            path,
            headers=headers,
            **kwargs,
        )

        return self._read_response(response)

    def admin_get(self, path, params=None):
        return self.admin_request(
            "GET",
            path,
            params=params,
        )

    def admin_post(self, path, data):
        return self.admin_request(
            "POST",
            path,
            json=data,
        )

    def device_request(
        self,
        method,
        path,
        **kwargs,
    ):
        response = self._request(
            method.upper(),
            path,
            device=True,
            **kwargs,
        )

        return self._read_response(response)

    def device_get(self, path, params=None):
        return self.device_request(
            "GET",
            path,
            params=params,
        )

    def device_post(self, path, data):
        return self.device_request(
            "POST",
            path,
            json=data,
        )

    def logout(self):
        try:
            self.refresh_csrf_token()

            self._request(
                "POST",
                "/api/auth/logout",
                headers={
                    "X-CSRF-TOKEN": self.csrf_token,
                },
            )

        finally:
            self.session.cookies.clear()
            self.csrf_token = None
            self.admin_authenticated = False

    def close(self):
        self.session.close()
        self.device_session.close()


def test_admin_connection():
    client = CampusApiClient()

    identifier = os.getenv(
        "CAMPUS_ADMIN_ID",
        "TEST-ADMIN-001",
    )

    password = getpass(
        "Enter temporary administrator password: "
    )

    logged_in = False

    try:
        user = client.login_admin(
            identifier,
            password,
        )

        logged_in = True

        print("University ID:", user["universityId"])
        print("Roles:", ", ".join(user["roles"]))

        endpoints = [
            "/api/parking/zones",
            "/api/integration/vehicles",
            "/api/persons",
            "/api/cameras",
        ]

        for endpoint in endpoints:
            client.admin_get(endpoint)
            print(f"PASS: {endpoint}")

        print("All read-only connection tests passed.")

    finally:
        try:
            if logged_in:
                client.logout()
                print("Logged out successfully.")
        finally:
            client.close()


if __name__ == "__main__":
    test_admin_connection()
