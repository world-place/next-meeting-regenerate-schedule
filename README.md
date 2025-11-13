# next-meeting-regenerate-index

**Cron job server** to generate schedule JSON files for NextMeeting project.

> ⚠️ **Migration Notice**: This has been converted from an AWS Lambda function to a Node.js cron job server for deployment on Fly.io or any Node.js hosting platform.

## Quick Start

### Local Development

1. Clone repo
2. Copy `.env.example` to `.env` in the project root and fill in your credentials
3. Run:

```bash
cd regenerate-schedule
npm install
npm start
```

The server will start on http://localhost:8080

**Endpoints:**
- `GET /health` - Health check
- `GET /` - Service info
- `POST /trigger` - Manually trigger a job run

### Deploy to Fly.io

See [regenerate-schedule/FLY_DEPLOYMENT.md](./regenerate-schedule/FLY_DEPLOYMENT.md) for complete deployment guide.

**Quick deploy:**

```bash
cd regenerate-schedule
fly launch --no-deploy
# Set your secrets (see FLY_DEPLOYMENT.md)
fly deploy
```

### Legacy Lambda Deployment (Deprecated)

The old Lambda deployment method (`deploy.sh`) is deprecated. Use Fly.io deployment instead.

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