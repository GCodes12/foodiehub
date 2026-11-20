#!/usr/bin/env bash
# Starts a local Consul agent in development mode for FoodieHub service discovery (DEC-019).
#  * single in-memory server: registrations disappear when it stops (services re-register on their next start);
#  * HTTP API and UI on http://localhost:8500, bound to 127.0.0.1 only;
#  * not a production configuration (no ACLs, no TLS, no persistence).
# Install once: brew tap hashicorp/tap && brew install hashicorp/tap/consul
#
# Usage (from the repository root): infra/consul/start-local-consul.sh      (Ctrl+C to stop)
set -euo pipefail
command -v consul >/dev/null 2>&1 || { echo "consul not found: brew tap hashicorp/tap && brew install hashicorp/tap/consul" >&2; exit 1; }
exec consul agent -dev -bind 127.0.0.1 -client 127.0.0.1 -ui -node foodiehub-dev -log-level warn
