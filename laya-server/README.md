# Laya server for Murmur

Runs [Laya](https://github.com/NandhaKishorM/laya), an open decision model, as an HTTP service.
Murmur's worker sends it one sentence per news source and Laya returns whether the report is
critical, neutral or supportive.

Endpoint: `POST /v1/systemone/batch`

## Deploy to Google Cloud Run

```bash
gcloud run deploy murmur-laya --source . --region us-central1 --allow-unauthenticated \
  --memory 4Gi --cpu 2 --port 8080 --min-instances 0 --max-instances 1
```

Put the service URL it prints in `LAYA_URL` in `../worker/wrangler.toml` and redeploy the worker.
