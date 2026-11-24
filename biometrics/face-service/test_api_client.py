
from getpass import getpass

from api_client import CampusApiClient


def main():
    client = CampusApiClient()
    logged_in = False

    try:
        client.login_admin(
            "TEST-ADMIN-001",
            getpass("Enter administrator password: "),
        )

        logged_in = True

        print("\nTesting authenticated write request...")

        try:
            client.admin_request(
                "PUT",
                "/api/alerts/2147483647/resolve",
            )
        except RuntimeError as error:
            if str(error).endswith("HTTP 404"):
                print("PASS: CSRF-protected request accepted.")
                print("PASS: Nonexistent alert returned 404.")
            else:
                raise
        else:
            raise RuntimeError(
                "Unexpected successful response."
            )

        print("\nTesting device request without a valid key...")

        invalid_client = CampusApiClient(
            device_key="invalid-test-key"
        )

        try:
            try:
                invalid_client.device_get(
                    "/api/faces/gallery"
                )
            except RuntimeError as error:
                if str(error).endswith("HTTP 401"):
                    print("PASS: Invalid device key rejected.")
                else:
                    raise
            else:
                raise RuntimeError(
                    "Invalid device key was accepted."
                )
        finally:
            invalid_client.close()

        print("\nAll API client security tests passed.")

    finally:
        try:
            if logged_in:
                client.logout()
                print("Logged out successfully.")
        finally:
            client.close()


if __name__ == "__main__":
    main()
