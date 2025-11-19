# next-meeting-regenerate-index

Lambda function to generate schedule JSON files for NextMeeting project.

## Usage

### Dev

1. Clone repo
2. Populate `.env` in the project root (See `.env.example`) and _Creating AWS Resources_ below.
3. Run:

```bash
cd regenerate-schedule
npm i # Only required first time
node app.js
```

> The function will run in the standard Node.js environment, bypassing the need for slow and clunky Lambda emulation tools (SA, Docker, etc.).

> Environment variables will be picked up from `.env` in project root. The function will explicitly fail if required variables are missing.

> In development, the generated files will be stored locally on disk as well for inspection

### Deploy

1. Run `regenerate-schedule/deploy.sh`

## Fly.io deployment

The repository now contains a Dockerfile, Fly entrypoint, and `fly.toml` so the worker can run on the Fly.io free tier (`shared-cpu-1x`, 256 MB) in Frankfurt (FRA). The worker container wraps the existing Lambda handler and re-runs it every hour by default.

### Prerequisites
- Install the Fly CLI (`https://fly.io/docs/hands-on/install-flyctl/`) and log in: `fly auth login`.
- Pick a unique Fly app name. Update the `app` value in `fly.toml` if Fly reports a naming collision.

### Required secrets
Set the environment variables that were previously kept in `.env` via Fly secrets. Run the following from the repo root (replace placeholder values):

```bash
fly secrets set \
  GOOGLE_API_CLIENT_EMAIL=... \
  GOOGLE_API_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
  AWS_ACCESS_KEY_ID=... \
  AWS_SECRET_ACCESS_KEY=... \
  CLOUDFRONT_DISTRIBUTION_ID=... \
  AWS_S3_BUCKET=... \
  AWS_S3_REGION=... \
  SLACK_WEBHOOK_URL=... \
  STATIC_SITE_S3_BUCKET=... \
  HONEYBADGER_API_KEY=... \
  HONEYBADGER_CHECK_IN_TOKEN=... \
  ERROR_WEBHOOK_URL=...
```

Optional knobs:

- `RUN_INTERVAL_MINUTES` (defaults to `60`) controls how frequently the job re-runs inside the Fly machine.
- `SUPPRESS_ERROR_NOTIFICATIONS=true` disables the secondary error webhook.

### One-command deploy

Once the secrets are in place you can deploy the worker with a single command:

```bash
fly deploy --remote-only
```

The `fly-entry.js` loop keeps the machine running and re-triggers the schedule regeneration job every `RUN_INTERVAL_MINUTES`. Because no ports are exposed there is nothing to scale down manually; Fly will keep exactly one free-tier machine (`shared-cpu-1x` in `fra`) online.

## Roadmap

### Dev
- [x] Load contents of Google sheet
- [x] Transform into schedule JSON
- [x] `gzip` and upload to S3
- [x] Invalidate Cloudfront
- [x] Slack notifications on success and failure

### DevOps
- [x] Create the bucket and Cloudfront distribution
- [x] Create an IAM user for local testing and deploying code
- [x] Deploy
- [x] Configure Lambda to be triggered once an hour

### Future
* Maybe store a small stats JSON in S3 and compare with it to detect changes. If nothing has changed we can save on S3 bandwidth and Cloudfront invalidations. (Maybe run anyway once every 6-12 hours to scroll the files forward by 24 hours)

## Thank You

* `google-spreadsheet` - Google Sheets Node.js library
* Luxon - Phenomenal timezone-aware date library
* AWS S3, Lambda, Cloudfront, (and SDK, of course)

### Appendix: Creating AWS resources

1. In the AWS console, create
  1. A Lambda function (Node.js 12+)
  2. An IAM role with permission to update the function code (`UpdateFunctionCode`)
  3. An S3 bucket (private access only)
  4. A Cloudfront distibution pointing at the S3 bucket
2. Update `.env` with these values
3. In the AWS Lambda console, configure the environment variables from your `.env`. (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` will automatically set by the Lambda environment)
4. In the IAM console for your function's execution role (Find it in `Lambda Console > Configuration > Basic settings > "View <lambda name> role on the IAM console."`), give the function the following permissions:
  * `s3 PutObject` and `s3 GetObject` for your S3 bucket
  * `cloudfront CreateInvalidation` for your Cloudfront invalidation

> Configure the function to run every hour using EventBridge