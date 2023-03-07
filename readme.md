### What's this

So this is a mini side project I built to help me track how my electricity meter amount is being utilized and how fast it is decreasing. Currently we don't have any way to know how fast is the meter balance is utilized in the bill payment apps like Paytm/Phonepe

### Setup

```sh
git clone https://github.com/PranjalAgni/electricity-recorder-worker.git
cd electricity-recorder-worker
npm install
```

### Run it locally

```sh
npx wrangler dev src/index.ts
```

### Send a request

```sh
curl "http://localhost:8787/__scheduled?cron=*/1+*+*+*+*"
```

### Tech stack

- Cloudflare Workers - Serverless functions invoked by a scheduled job
- Paytm API - To fetch the electricity meter balance
- Airtable - Using as a database for recording the electricity bill amount
- Typescript - For implementing everything
- Wrangler CLI - For doing everything with Cloudflare workers

### How it works?

So we are using Cloudflare workers which provides the capability to run serverless functions as [scheduled jobs using Cron](https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/), then we fetch our meter balance using Paytm electricity API as this is not a documented API I use my own cookie to send the request thankfully Paytm cookie does not expieres for a long time until you logout manually. After successfully fetching the balance we push it to [Airtable](https://airtable.com/) which I can access easily using it's mobile app. Our worker runs everyday around 1AM and record the current balance

### Things to do

- [ ] Monitoring and alerting - Notify if the worker fails
- [ ] Explore better logging for the worker
- [ ] POC: Is there a way to refresh Paytm cookie if it experies
- [ ] Airtable make a graph(Line Chart) using the electricity bill data
