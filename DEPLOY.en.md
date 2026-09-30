# Deployment and Operations

[Русский](DEPLOY.md) · **English** · [Home](README.en.md)

This guide describes deploying MVP 1.0 on one VPS. HTTPS terminates at an external HAProxy. Local nginx forwards requests to the web container, published on loopback only. The API, PostgreSQL, and Redis are available on the internal container network.

The MVP 1.1 mail category is not yet implemented. Its future SMTP connection requirements are described in [PRD 1.1](docs/en/03-prd-1.1.md).

## 1. Server Preparation

The previous edition recorded AlmaLinux 9.8, Docker 29.8, and Docker Compose 5.5. The commands below target an EL9-family server. Compatibility must be verified for the installation environment; this editorial revision is not a repeated infrastructure test.

```bash
dnf -y install git dnf-plugins-core
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin nginx bind-utils
systemctl enable --now docker nginx
docker --version
docker compose version
```

Use the `docker compose` plugin. If packages conflict, first determine whether installed Podman, runc, or Buildah components are used by other services; removing them is not a required installation step.

Compose uses named volumes. With SELinux Enforcing, nginx requires `httpd_can_network_connect` permission to connect to the local port.

## 2. Incoming Traffic

```text
Browser → HTTPS → HAProxy → HTTP → nginx :80 → 127.0.0.1:3000
```

The nginx configuration is in `deploy/nginx.example.conf`. Before applying it, verify the HAProxy addresses, destination address and port, and forwarding of `Host` and `X-Forwarded-Proto`. Trusted addresses are set through `set_real_ip_from` and must match the actual proxy nodes.

The `default_server` setting assumes a dedicated application server. When hosting multiple sites, configure each hostname explicitly.

## 3. Outbound Network

The implemented DNS module uses UDP 53. Testing TCP port 53 does not establish that its queries can pass. RDAP uses HTTPS; fallback WHOIS uses TCP 43. TLS checks require access to port 443 on the target addresses.

```bash
dig @8.8.8.8 uz NS
dig @9.9.9.10 uz NS
curl -s -o /dev/null -w 'rdap=%{http_code}\n' https://rdap.cctld.uz/domain/cctld.uz
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/whois.cctld.uz/43'
```

Expect DNS responses containing the zone's NS records, a successful RDAP HTTP response, and a successful WHOIS connection. No response or a timeout requires checking routing and outbound-access rules. An empty DNS response for an arbitrary name does not itself establish a network failure.

Check RDAP and WHOIS availability separately. One working source does not establish that the fallback is available.

## 4. Configuration

Create `.env` beside `docker-compose.prod.yml`. The example contains a placeholder password; replace it before starting.

```dotenv
SITE_DOMAIN=2check.uz
WEB_PORT=3000
POSTGRES_USER=twocheck
POSTGRES_PASSWORD=REPLACE_WITH_A_LONG_RANDOM_PASSWORD
POSTGRES_DB=twocheck
APPLICATION_RELEASE_VERSION=1.0.0
LOG_LEVEL=info
```

The file contains the database secret, is excluded from Git, and should have mode `600`. `APPLICATION_RELEASE_VERSION` identifies the build; updates use the commit identifier.

## 5. Initial Installation

```bash
chmod 600 .env
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
docker compose -f docker-compose.prod.yml up -d api web
```

Migrations run explicitly before the new API version starts. An advisory lock protects concurrent migration execution. Then install the reviewed nginx configuration:

```bash
cp deploy/nginx.example.conf /etc/nginx/conf.d/2check.conf
setsebool -P httpd_can_network_connect 1
nginx -t
systemctl reload nginx
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: 2check.uz' http://127.0.0.1/ru
```

The `setsebool` command is needed with SELinux Enforcing. After verifying the local route, configure HAProxy to use the VM address and port 80.

## 6. Readiness Checks

Check the web interface, API readiness, and release manifest separately:

```bash
curl -s http://127.0.0.1:3000/ru -o /dev/null -w '%{http_code}\n'
docker compose -f docker-compose.prod.yml exec api node -e "fetch('http://127.0.0.1:3001/readyz').then(r=>r.json()).then(d=>console.log(JSON.stringify(d,null,2)))"
docker compose -f docker-compose.prod.yml exec api node -e "fetch('http://127.0.0.1:3001/release').then(r=>r.json()).then(d=>console.log(JSON.stringify(d,null,2)))"
```

`READY` confirms readiness of required components. `DEGRADED` is used when Redis is unavailable; `NOT_READY` prevents serving traffic because the scan store is unavailable or incompatible.

After installation, verify PostgreSQL migrations, Redis cache reuse, DNS responses, `.uz` RDAP/WHOIS, and the TLS handshake. Tests using recorded data do not replace availability checks in the target network.

For diagnostics without a browser:

```bash
docker compose -f docker-compose.prod.yml exec api node dist/cli/inspect.js example.uz
```

## 7. Backups

The selected backup method is VM snapshots including the PostgreSQL volume. Recovery must be verified separately: an existing snapshot alone does not establish database recoverability. Save an additional logical dump before a migration:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U twocheck twocheck | gzip > backup-$(date +%F).sql.gz
```

Redis contains reusable cache data and is not an authoritative backup source.

## 8. Updates and Rollback

The standard update command is:

```bash
./deploy.sh
```

The script fast-forwards `main`, sets the release identifier, builds images, runs migrations, starts the application, and waits for readiness. The equivalent manual sequence is:

```bash
git pull --ff-only
export APPLICATION_RELEASE_VERSION=$(git rev-parse --short HEAD)
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
docker compose -f docker-compose.prod.yml up -d api web
```

The order is required: **build → migrate → start**. Use the same release identifier for building, migration, and startup. A new API version is not ready to accept scans until the database schema is compatible.

Application rollback rebuilds a selected earlier release. It does not automatically reverse a migration. Before a destructive migration, determine the recovery method and whether rollback is supported. Historical scan results retain their original meaning.

## 9. Known Limitations

- The Uzbek catalogue was prepared by Claude; native-speaker review is not confirmed in the documentation. It remains a separate task.
- This guide does not record completion of the full browser matrix, accessibility review, or load tests. A launch without these checks was previously recorded; it does not establish PRD acceptance.
- The full server-side `retryability` model is not yet included in check results. A retry delay on request-admission failure does not replace that model.
- Scan-creation rate limits and overall concurrency limits are implemented. Protection against `scanId` enumeration and a separate `FORCE_REFRESH` abuse policy still require review before widening public access.

## 10. Load Limits

| Parameter | Default | Behavior |
|---|---|---|
| `SCAN_DEADLINE_MS` | `30000` | Overall scan deadline. Active execution ends with `completionReason=DEADLINE_TERMINALIZED` when it expires; unfinished checks receive `UNKNOWN` and `scan_deadline_exceeded`. |
| `SCAN_MAX_CONCURRENT` | `4` | Maximum concurrent scans; excess requests receive HTTP 503. |
| `SCAN_RATE_LIMIT_PER_MINUTE` | `12` | Maximum scan starts per client per minute; excess requests receive HTTP 429. |

The API reads these variables. The current `docker-compose.prod.yml` does not forward them through `environment`; explicitly pass them to the container to change their values. Adding them only to `.env` does not do this.

Lost execution after a restart ends as `FAILED` with `execution_state_unrecoverable`. This differs from normal termination at the overall deadline.

## 11. Client Address and Proxy Trust

Rate limiting uses the client address. nginx accepts `X-Forwarded-For` only from trusted HAProxy nodes and forwards the established address to the application. Test from outside the server:

```bash
curl -s https://2check.uz/api/whoami
curl -s -H 'X-Forwarded-For: 203.0.113.99' https://2check.uz/api/whoami
```

Both responses should contain the actual client address. If an arbitrary header changes the result, inspect the entire HAProxy → nginx → application chain and its trust configuration. Request limiting at the external proxy complements application controls.

## 12. Incomplete-Scan Diagnostics

First check API readiness, database availability, and the log:

```bash
docker compose -f docker-compose.prod.yml logs --tail=80 api
```

Messages such as `column does not exist` or `Storage schema version ... does not match` indicate a schema problem. Compare the build identifier with the applied migrations. Once the cause is confirmed, use the update sequence in section 8. A timeout alone does not establish a missing migration.

## 13. Usage Statistics

The service collects its own analytics in `analytics_events`. Display a report for 30 days or a selected period:

```bash
docker compose -f docker-compose.prod.yml exec api node dist/cli/stats.js
docker compose -f docker-compose.prod.yml exec api node dist/cli/stats.js 7
```

The report includes visits, scan stages, result views, technical details, and sharing actions. Domain names, scan identifiers, original input, IP addresses, and registrant data are not accepted in analytics events.

Pruning events older than 400 days is explicit. Select the value according to the retention policy:

```bash
docker compose -f docker-compose.prod.yml exec api node dist/cli/stats.js --prune 400
```

## 14. Address Observability Limits

The scanner may lack a working route to public addresses of its own infrastructure. This network effect must not be interpreted as a confirmed domain defect.

Use `SECURITY_INTERNAL_DENYLIST` for known affected addresses. Its value is deployment-specific; an example from the existing configuration is:

```dotenv
SECURITY_INTERNAL_DENYLIST=91.216.37.0/24
```

Affected targets receive `UNKNOWN` with `ssrf_policy_block`. Changing the list changes `securityPolicyVersion`. An invalid value blocks startup; an empty value adds no restrictions.

The list records an observation limitation and does not repair the route. Hairpin NAT or routing changes are verified separately by the infrastructure team.
