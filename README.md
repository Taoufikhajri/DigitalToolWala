# DigitalToolWala — Branded Client Link Portal

A Vercel-ready extension of your existing Gemini link app. Each client signs in, pastes up to 100 original Google activation links, and receives encrypted links with their assigned brand. The supplier API is called when the customer opens the link, not when a batch is created.

## What clients can do

- Sign in using their own username and password.
- Create up to 100 branded links per batch; duplicate tokens are skipped.
- Copy individual links, copy a batch, or download a TXT file.
- Show their assigned brand on the customer loading screen.
- Use the portal domain or an owner-configured custom domain.

Example output:
`https://your-project.vercel.app/b/em-store/subscription/new/ENCRYPTED_CODE`

Your original `/subscription/new/CODE` links and your old admin tools remain supported. The original management page has moved to `/admin` and still uses ADMIN_USERNAME / ADMIN_PASSWORD.

## Deploy on Vercel

1. Extract this ZIP and upload the project contents into your GitHub repository. The package.json file belongs at the repository root, not inside a second folder.
2. Import the repository into Vercel as a Next.js project, or update your current project's repository. Use Node.js 22 or newer.
3. Add the environment variables below in Vercel → Project Settings → Environment Variables. Redeploy after changing them.
4. Open your production domain. Clients use the sign-in page at `/`. You use `/admin` for the original management tools.

| Variable | Value |
| --- | --- |
| `GVL_AUTH` | Supplier's auth-header value from your supplied API documentation |
| `PUBLIC_ORIGIN` | Your production origin, e.g. `https://gemini-pro-jet-phi.vercel.app`, no trailing slash |
| `LINK_KEY` | Existing 64-character hex encryption key, or a newly generated key for a new deployment |
| `SESSION_SECRET` | New 64-character hex secret, separate from LINK_KEY |
| `ADMIN_USERNAME` | Your admin username |
| `ADMIN_PASSWORD` | Strong admin password, at least 16 characters |
| `CLIENTS_JSON` | Generated client-account JSON, explained below |

Keep secrets server-side. Do not prefix these variables with NEXT_PUBLIC_. No supplier auth value is included in this ZIP.

**Updating your existing app:** keep your current LINK_KEY, PUBLIC_ORIGIN, GVL_AUTH and admin credentials. Changing LINK_KEY invalidates existing delivery links. Only add SESSION_SECRET and CLIENTS_JSON. If preserving the old deployment is important, deploy a separate project instead.

For a new installation only:

```bash
npm ci
npm run generate-secrets
```

For an existing installation, generate only the new session secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Add a client account

Run locally from the project folder (requires Node.js 22+):

```bash
npm ci
npm run add-client -- emstore "EM Store" em-store
npm run add-client -- everest "Everest Digital Store" everest-digital
```

Each command prints a randomly generated password. Give the client their username, password, and your portal URL. The account password is stored as a salted scrypt hash.

The command maintains two private local files:

- `clients.private.json`: all account settings, formatted for editing.
- `clients-env.private.txt`: the complete one-line value for CLIENTS_JSON.

Copy the **entire contents** of clients-env.private.txt into the Vercel CLIENTS_JSON variable, then redeploy. Both private files are ignored by Git. Retain them privately so the next client can be appended to the existing list. If using a different computer, restore your existing CLIENTS_JSON as clients.private.json before adding accounts; otherwise replacing the environment variable would remove earlier accounts.

The client brand and origin are controlled by you. Clients cannot edit them or access your supplier credential. Root reseller accounts use owner-managed configuration. Subclients use the online reseller controls and persistent Redis storage described below.

### Change, disable, or remove an account

Edit clients.private.json, then regenerate the one-line value:

```bash
node -e "const fs=require('node:fs'); fs.writeFileSync('clients-env.private.txt',JSON.stringify(JSON.parse(fs.readFileSync('clients.private.json','utf8'))))"
```

Update CLIENTS_JSON in Vercel and redeploy. Use `"enabled": false` to disable an account. Removing or disabling an account also disables its branded customer links. Account changes invalidate its existing sign-in sessions. Keep the same slug to preserve brand links; changing the slug invalidates them. To reset a password, remove its entry locally and rerun add-client with the same username, brand, and slug, then republish the full list.

## Client's own domain

First connect the domain to **this Vercel project**, verify ownership if requested, and configure DNS using the records Vercel provides. See https://vercel.com/docs/domains/working-with-domains/add-a-domain.

Then create the account with its configured origin:

```bash
npm run add-client -- emstore "EM Store" em-store https://links.emstore.com
```

For an existing account, add `"origin": "https://links.emstore.com"` to its settings and update CLIENTS_JSON. Clients still sign in on PUBLIC_ORIGIN. Their outputs use their custom domain. Keep a brand's output origin stable: customer links are only accepted on that brand's configured origin. This app does not purchase domains or configure DNS automatically.

## Local development

```bash
npm ci
cp .env.example .env.local
# Fill in your real settings. PUBLIC_ORIGIN may be http://localhost:3000 locally.
npm run dev
```

Use localhost:3000 consistently; mixing localhost and 127.0.0.1 fails the origin check. Custom client origins require HTTPS and are intended for production.

## Behaviour and limits

- The seven-day opening window is the same as the supplied app. It is not a subscription duration, a warranty, or proof that the supplier can refresh the token for seven days.
- HTTP(S) activation links from any domain containing one unambiguous AQCpiI token, and raw AQCpiI tokens, are accepted. Existing encrypted Vercel links are not valid inputs.
- No batch history is stored; copy or download results before closing the page.
- The upstream API must recognize the token. Creation alone cannot verify eligibility or availability.
- Opening a customer link sends only its token to the supplied GET API with the server-side auth header. A successful response is redirected to the returned Google URL.
- Supplier 401, 404, 429, timeout, and unexpected URL errors are handled. The supplier limit in your documentation is 100 requests/minute per IP, shared across clients. There is no global queue; a busy supplier returns a retry message.
- Client sessions last eight hours in HttpOnly, SameSite=Strict cookies. Production cookies use Secure. Brand-specific derived encryption keys prevent changing a link's brand path to open it under another account.
- The built-in login throttle is per server instance and is best effort on Vercel. For broader public usage, enable Vercel Firewall rate limiting for POST `/api/client/login`; this package does not provide a distributed login limiter.
- Google sign-in happens only on Google's website. This app does not collect Google credentials.

## Validation

```bash
npm run typecheck
npm test
npm run build
node scripts/check-http.mjs
```

Tests cover original links, expiry, upstream response validation, password hashes, signed session tampering and expiry, disabled accounts, brand-key isolation, and HTML escaping. Supplier calls are mocked in tests; no live activation is consumed.

This ZIP is source code ready to configure and deploy; it does not update your live Vercel project automatically.

## Configuration fix

This update normalizes trailing slashes in PUBLIC_ORIGIN, accepts uppercase hex and surrounding whitespace in LINK_KEY, and reports invalid encryption-key configuration directly instead of showing a generic creation error. Existing valid encryption keys derive the same client keys. Keep all your existing Vercel secrets and CLIENTS_JSON when updating.

## Resellers and subclients

Existing CLIENTS_JSON accounts are resellers by default. Sign in using a client account and click **My subclients**. Each reseller can create accounts, list only their own accounts, reset passwords, and enable or disable access. Subclients cannot create further subclients. Use `"reseller": false` in a root account to prevent it from managing subclients; this also blocks its existing subclient accounts.

### One-time storage setup

1. Create a **Redis** database in your Upstash account at https://console.upstash.com. Use a dedicated database for this portal.
2. In the database's Connect / REST section, copy the REST URL and the full-access REST token. The read-only token cannot create accounts.
3. Add these two variables to the same Vercel project, for the Production environment:

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-full-access-rest-token
```

4. Keep your existing GVL_AUTH, LINK_KEY, SESSION_SECRET, CLIENTS_JSON and admin variables. Deploy the updated code and redeploy after adding the storage variables.
5. Sign in as a reseller, open **My subclients**, and create a customer account. Share the displayed portal URL, username, and generated password with the customer.

Reference: https://upstash.com/docs/redis/features/restapi. The app uses authenticated HTTPS commands and Lua scripts for atomic creation and ownership-checked updates.

### What each reseller controls

- A subclient username is prefixed with its reseller's slug, for example `em-store_customer1`. Different resellers can use the same short username.
- A subclient gets its own brand and encrypted delivery-link identity. Its output domain is inherited from its reseller **at creation**. This does not automatically register a new domain.
- Passwords are generated randomly and stored as salted scrypt hashes. The plaintext password is returned only on creation or password reset; it cannot be retrieved later.
- The reseller cannot see another reseller's accounts or change their passwords or status. Ownership is checked on the server, including atomic database updates.
- Disabling a subclient revokes sign-in access and stops its customer links. Re-enabling restores links still within their opening window. Resetting its password signs out existing sessions and preserves its customer links.
- Disabling or removing the parent reseller, or setting reseller=false, also blocks every subclient under that reseller. Password resets of the parent do not reset child passwords.
- Newly created subclients are stored persistently without changing CLIENTS_JSON or redeploying. Root accounts continue to be managed through CLIENTS_JSON.
- Keep root usernames and slugs stable. Changing a root username disconnects its subclients; changing its slug affects future prefixes. Use a dedicated Upstash database and keep backups if you need to retain your account directory.
- The admin `/admin` page remains the original link management interface. Subclient management lives inside each reseller's client account.
- Without the new Redis variables, existing root logins and root link creation still work; the reseller tab shows a storage-setup message. Subclient logins and links require Redis to remain available.

### Additional verification

The supplementary ownership and atomic-update checks run against fakeredis's Lua interpreter. For developers who want to rerun them:

```bash
python3 -m pip install 'fakeredis[lua]'
node qa/check-subclients.mjs
```

These are local tests; they do not require a live Upstash database. The normal npm tests, production build, and root-account HTTP checks also pass. Production Upstash connection still requires the two variables above.

## Subclient storage troubleshooting

If My subclients shows an error, verify both REST variables come from the same active Upstash Redis database. Use its HTTPS REST URL (not the Redis/TCP connection string) and its full-access token (not the read-only token). Add them to Vercel Production and redeploy. This update trims surrounding spaces in both settings and identifies invalid URLs, rejected tokens, denied permissions, network failures, and usage limits without displaying secret values. It also fixes the username pattern for browsers using Unicode-set regular expressions.

## Google One activation links

Both clients and subclients, as well as the admin batch importer, now accept HTTPS links with either of these exact hosts and paths:

- `https://serviceactivation.google.com/subscription/new/TOKEN`
- `https://one.google.com/activate-plan/subscription/new/TOKEN?g1_landing_page=5`

The token is extracted from the path only. Query parameters and fragments are excluded from the supplier token. Duplicates across both URL forms and raw tokens are skipped. If the supplier returns either supported Google URL, the redirect accepts it and preserves that returned URL's query parameters. Supplier redirects remain restricted to those exact Google hosts and paths. Accepting this format does not confirm the supplier has registered the token. Keep your existing deployment variables and keys.

## Flexible link import

Clients, subclients, and the admin importer can now paste HTTP(S) activation links from any domain. The importer looks for a complete AQCpiI token in path segments, query parameters, fragments, or encoded nested URLs. It also accepts raw tokens, angle-bracket links and single Markdown links. No pasted URL is fetched or followed. The supplier API still receives only the extracted token. Query tracking parameters are excluded.

Example accepted formats:

- `https://any-domain.example/offer/AQCpiIexample==`
- `https://any-domain.example/?token=AQCpiIexample==`
- `https://any-domain.example/redirect?url=<URL-encoded activation link>`
- `https://any-domain.example/#AQCpiIexample==`

A URL with no visible supplier token cannot be refreshed. Short links that hide their destination and encrypted delivery links require the original activation URL or raw token. Multiple different tokens in one line are rejected to avoid importing the wrong offer. The supplier must still recognize the token. The allowed supplier response destinations remain the supported Google activation pages; this update changes input parsing. No environment variable changes are needed.

## Short customer links

After creating a batch, click **Shorten all**. The displayed links change to `https://your-domain/s/RANDOM_ID`. Copy all, individual Copy, and Download TXT then use the shortened URLs. This feature is available to both clients and subclients.

Short links use the existing Upstash REST configuration; no new environment variables are required when reseller storage is already configured. If Redis has not been connected, add UPSTASH_REDIS_REST_URL and the full-access UPSTASH_REDIS_REST_TOKEN, then redeploy. Long link creation continues to work without Redis.

Only active branded delivery links generated by the signed-in account can be shortened. Shortening never calls the supplier API, and it does not extend the original seven-day opening window. The mappings have the same expiry as the encrypted original and are stored with Redis TTLs. Opening a short link redirects to the existing branded activation page, which refreshes through the supplier as before. Deactivated clients/subclients, expired links, and changed encryption keys block shortened links too. Keep the output domain, account slug, LINK_KEY and Redis database stable.

The mapping is stored in Redis so downloaded short links keep working after sign-out and app restarts. The portal still does not store a browsable batch history. Short links can be re-created from the original branded URLs if needed.

Additional local short-link checks (requires the fakeredis dependency described above):

```bash
node qa/check-short-links.mjs
```
