# Gemini Pro Activation — GitHub + Vercel

A complete Next.js app with a password-protected manager and public customer activation links. This version runs independently on Vercel; it does not depend on ChatGPT Sites or Cloudflare bindings.

## What it does

- Upload a TXT file or paste one Google activation link/token per line.
- Create encrypted customer links with a 7-day opening window.
- When a customer opens a link, refresh its token through your supplier's API and automatically continue to Google's activation page.
- Batch-refresh links, remove duplicates, pause/resume, retry errors, and download TXT/JSON results.
- Keep supplier credentials and encryption keys on the server.

The customer flow is: open customer link → brief refresh screen → Google activation page → sign in to Google. JavaScript is required. Preview GET/HEAD requests do not refresh the token; the page starts a POST when actually opened in a browser.

## 1. Upload to GitHub

1. Extract `gemini-pro-vercel.zip` on your computer.
2. Create a new GitHub repository, for example `gemini-pro-activation`.
3. Use **Add file → Upload files** and upload the extracted files and folders.
4. Make sure `package.json`, `package-lock.json`, and `README.md` are at the repository root, alongside `app/`, `components/`, `lib/`, `public/`, and `vendor/`.
5. Commit the files. Upload the extracted contents, not the ZIP itself.

Do not commit `.env.local`, actual API credentials, `node_modules/`, or `.next/`. The included `.gitignore` excludes these. `.env.example` contains placeholders only and may be committed.

## 2. Generate your admin password and encryption key

Install Node.js 22.13 or later, open a terminal in the extracted folder, and run:

```bash
npm run generate-secrets
```

This command requires no dependency installation. It prints a new `LINK_KEY`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`. Save them privately for the next step. Do not paste them into GitHub files.

## 3. Import into Vercel

1. Open [Vercel](https://vercel.com/new), choose **Add New → Project**, and import your GitHub repository.
2. Select **Next.js** as the framework. Leave the root directory at the folder containing `package.json` and use the included build/install configuration.
3. Add these **Environment Variables**, with the exact names below, to Production. Also add them to Preview/Development if you want those environments to work.

| Variable | Value |
| --- | --- |
| `GVL_AUTH` | The `auth` header credential from your supplier's README |
| `LINK_KEY` | The 64-character hex value from `npm run generate-secrets` |
| `ADMIN_USERNAME` | `admin`, or a username you choose |
| `ADMIN_PASSWORD` | The generated password; at least 16 characters |
| `PUBLIC_ORIGIN` | Your stable production URL, for example `https://gemini-pro-activation.vercel.app` |

Use your actual production domain, not a temporary preview URL. Do not prefix these names with `NEXT_PUBLIC_`. Set sensitive values as private environment variables.

4. Click **Deploy**. If the final domain differs from `PUBLIC_ORIGIN`, update `PUBLIC_ORIGIN` and redeploy before creating customer links.
5. Make sure the **production domain is accessible to customers** under **Settings → Deployment Protection**. Standard Protection can keep preview/deployment URLs protected while allowing the production domain. Do not use All Deployments protection for customer delivery unless you intentionally want customers to authenticate with Vercel.
6. Open the production homepage. Your browser will ask for the admin username/password. This protects the manager and its APIs; `/subscription/new/...` customer links remain accessible without that login.

The app sets a 60-second maximum duration on refresh routes and a 55-second supplier timeout. Ensure your Vercel function settings support this duration. New Vercel projects normally use Fluid compute; keep it enabled for the supplier requests.

## 4. Create and share customer links

1. Open your production homepage and log in as admin.
2. Choose **Direct customer links**.
3. Upload your TXT file or paste the Google activation links.
4. Click **Create customer links**.
5. Copy a customer link or choose **Download customer TXT**.
6. Share the generated customer URL. Do not share your admin login or API credential.

Creating a link does not call the supplier or verify the offer. The supplier validates and refreshes it when the customer opens it. A 7-day opening window does not guarantee that Google's offer remains available or that an already used token can be refreshed. The supplied README states API access expires on 29 October 2026; confirm renewals with your supplier.

Each unique input becomes one link. Duplicate input tokens are removed. Links use encrypted tokens rather than database records, so they continue working after restarts without a database. Keep the same `LINK_KEY` across redeployments: changing it invalidates every previously generated link on this deployment. Download TXT/report results before closing the manager tab; its current batch is not saved as a server-side history.

## Custom domain

Add a domain you own under **Vercel → Project → Settings → Domains** and follow Vercel's DNS instructions. Set `PUBLIC_ORIGIN` to `https://your-domain.com` and redeploy. Newly created links will use that domain. Keep the old domain working while older issued links are still in use.

Existing links from the earlier `.chatgpt.site` deployment continue to use that deployment. They are not automatically migrated into this new app.

## Run locally

```bash
npm ci
```

Copy `.env.example` to `.env.local`, replace all placeholders, and set `PUBLIC_ORIGIN=http://localhost:3000` for local development. For example:

```bash
cp .env.example .env.local
npm run dev
```

Use HTTPS for your deployed production domain. The manager login uses HTTP Basic authentication, so the browser handles the login prompt. To switch credentials or clear a cached login, close the browser session or use a private window.

## Validate

```bash
npm test
npm run typecheck
npm run build
```

Tests use simulated supplier responses and never transmit your real API credential. They cover admin authorization, import parsing, encryption, expiry, tampering, redirects, and supplier errors. Test a supplier-registered token yourself after deployment to verify actual activation.

## Supplier endpoint

The app uses the endpoint given in your README:

```text
GET https://prod.38742386.top/api/v1/getvalidlink/43734638/?token=TOKEN
Header: auth: value-from-GVL_AUTH
```

Only the token is sent, not the original URL. The app uses the returned `url` on success. The supplier's documented limit is 100 requests/minute/IP; batch refresh is paced and rate-limit responses pause/retry. Concurrent customers may still reach the supplier's limit and will see a retry message.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Homepage says to set `ADMIN_PASSWORD` | Add a password of at least 16 characters and redeploy |
| Browser asks for login repeatedly | Check `ADMIN_USERNAME` and `ADMIN_PASSWORD`; try a private window |
| Customer sees Vercel login | Use the production domain and review Deployment Protection |
| Direct links cannot be created | Check `PUBLIC_ORIGIN` and that `LINK_KEY` is exactly 64 hex characters |
| Links are invalid after redeploy | Restore the original `LINK_KEY` used to create them |
| Supplier access is unavailable | Check `GVL_AUTH` and supplier access expiry |
| Token not found | The token must be registered with this supplier |
| Supplier is busy | Wait one minute and retry |
| Supplier times out | Check supplier availability and Vercel function duration |

## Official deployment references

- [Import a Git repository into Vercel](https://vercel.com/docs/git)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Deployment Protection](https://vercel.com/docs/deployment-protection)
- [Function maximum duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy)
