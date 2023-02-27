/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		await gatherElectricityData();
		return new Response("Lets record 🔌");
	},
};

async function gatherElectricityData() {
	const response = await fetch(
		"https://paytm.com/papi/digitalrecharge/v1/expressrecharge/verify?payment_info=1&native_withdraw=1&channel=web&version=2&child_site_id=1&site_id=1&locale=en-in&client=WEB",
		{
			headers: {
				accept: "*/*",
				"accept-language": "en-IN,en-US;q=0.9,en;q=0.8",
				"cache-control": "no-cache",
				"content-type": "application/json; charset=utf-8",
				pragma: "no-cache",
				"sec-ch-ua":
					'"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": '"macOS"',
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-origin",
				"sec-gpc": "1",
				"x-csrf-token": "gdTdEmnJ-Wx1Tsa0ChBe82mfcAXX_kAOrnAo",
				"x-xsrf-token": "gdTdEmnJ-Wx1Tsa0ChBe82mfcAXX_kAOrnAo",
				cookie:
					'connect.sid=s%3APUrFyEZB55gkJWzAfruJvaARSMzk71cR.5W4Hy6wZYaLVQCUQvsnV190%2F%2FxZ2U92HCAQGGHN58Ds; signalSDKVisitorId=cc8e0e20-b4dc-11ed-9d09-37197a6d9aef; ext_name=ojplmecpdpgccookcobabopnaifgidhf; _cfuvid=tiKUGfm8MShkmze_Zm2n6FomqGQJIweUX1BoeolrHhM-1677348402087-0-604800000; __cf_bm=7yprfFeamzefMgns0sR_ur7iyTQ1QdSZ8r5rhItZ2hM-1677521925-0-Ac2nLT5b6oCgpCW5OCvEowLoBra9LjtSsfuNG9IN7PvII2EnNsO8Ma1pFrY6L781L+JHR8Q1+0WpXZIORpMh8wU=; prodDetails={"products":{}}; XSRF-TOKEN=gdTdEmnJ-Wx1Tsa0ChBe82mfcAXX_kAOrnAo',
				Referer: "https://paytm.com/electricity-bill-payment",
				"Referrer-Policy": "strict-origin-when-cross-origin",
			},
			body: '{"cart_items":[{"product_id":303178550,"qty":1,"configuration":{"price":"10","recharge_number":"B17201"},"meta_data":{"checkBoxKey":"Electricity","city":"Hyderabad","society":"My Home Vihanga","utility_type_1":"N/A","utility_type":"Electricity","newVerify":true,"protection_url":"https://paytm.com/protection/v2/public/attachment/policies?categoryId=101950"}}]}',
			method: "POST",
		}
	);

	const data = await response.json();
	console.log("Data: ", data);
}
