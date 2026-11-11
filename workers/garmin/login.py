"""One-time Garmin login. Run this on your own computer, not in CI.

    pip install -r workers/garmin/requirements.txt
    SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... python workers/garmin/login.py

Prompts for your Garmin email, password and MFA code (if enabled), then
stores the resulting session tokens in public.cos_secrets ('garmin_tokens').
Your password is never stored; sync.py refreshes the tokens on every run.
"""

import getpass
import os

from garminconnect import Garmin

from sync import save_tokens


def main() -> None:
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.")
    email = input("Garmin email: ").strip()
    password = getpass.getpass("Garmin password: ")
    g = Garmin(email, password, prompt_mfa=lambda: input("MFA code: ").strip())
    g.login()
    save_tokens(g.client.dumps())
    print(f"Logged in as {g.get_full_name()}. Tokens saved to Supabase.")


if __name__ == "__main__":
    main()
