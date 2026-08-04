#!/usr/bin/env python3
"""One-time helper: log in to Garmin locally and print a reusable token.

Run this on your own computer (never in CI). It handles MFA if your account
has it, then prints a token string. Copy that whole string into a GitHub
repository secret named GARMIN_TOKEN (Settings -> Secrets and variables ->
Actions -> New repository secret). The scheduled sync then uses the token and
never needs your password or MFA again.

    pip install garth
    python scripts/garmin_login.py
"""
import getpass

import garth


def main() -> None:
    email = input("Garmin email: ").strip()
    password = getpass.getpass("Garmin password: ")
    # prompt_mfa is only called if the account requires a code.
    garth.login(email, password, prompt_mfa=lambda: input("MFA code: ").strip())
    token = garth.client.dumps()
    print("\n=== Copy everything between the lines into the GARMIN_TOKEN secret ===")
    print(token)
    print("=== end ===")


if __name__ == "__main__":
    main()
