#!/usr/bin/env bash
set -euo pipefail
app="${1:?Usage: smoke.sh https://app-domain https://api-domain}"
api="${2:?Provide the API URL}"
curl --fail --silent --show-error "$api/readyz"
curl --fail --silent --show-error --output /dev/null "$app/login"
code="$(curl --silent --output /dev/null --write-out '%{http_code}' --data-urlencode 'signed_request=invalid.payload' "$api/webhooks/meta/data-deletion")"
[[ "$code" == 403 ]] || { echo "Forged deletion returned $code, expected 403" >&2; exit 1; }
echo 'Public HTTP smoke passed. Complete the live-provider acceptance checklist before launch.'
