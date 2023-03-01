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
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const data = await gatherElectricityData();
		console.log(JSON.stringify(data, null, 3));
	},
};

async function gatherElectricityData(): Promise<any> {
	const API_URL = constructPaytmUrl();
	const opts = getHeaders();
	const response = await fetch(API_URL, {
		headers: opts,
		body: JSON.stringify({
			cart_items: [
				{
					product_id: 303178550,
					qty: 1,
					configuration: {
						price: "10",
						recharge_number: "B17201",
					},
				},
			],
		}),
		method: "POST",
	});

	const data = await response.json();
	return data;
}

const constructPaytmUrl = () => {
	const apiUrl = new URL(
		"https://paytm.com/papi/digitalrecharge/v1/expressrecharge/verify"
	);
	apiUrl.searchParams.set("payment_info", "1");
	apiUrl.searchParams.set("native_withdraw", "1");
	apiUrl.searchParams.set("channel", "web");
	apiUrl.searchParams.set("version", "2");
	apiUrl.searchParams.set("child_site_id", "1");
	apiUrl.searchParams.set("site_id", "1");
	apiUrl.searchParams.set("locale", "en-in");
	apiUrl.searchParams.set("client", "WEB");

	return apiUrl;
};

const getHeaders = () => {
	const headers = {
		"user-agent": "cloudflare-worker",
		"content-type": "application/json",
		"x-csrf-token": "gdTdEmnJ-Wx1Tsa0ChBe82mfcAXX_kAOrnAo",
		"x-xsrf-token": "gdTdEmnJ-Wx1Tsa0ChBe82mfcAXX_kAOrnAo",
		cookie: `connect.sid=s%3APUrFyEZB55gkJWzAfruJvaARSMzk71cR.5W4Hy6wZYaLVQCUQvsnV190%2F%2FxZ2U92HCAQGGHN58Ds; signalSDKVisitorId=cc8e0e20-b4dc-11ed-9d09-37197a6d9aef; ext_name=ojplmecpdpgccookcobabopnaifgidhf; _cfuvid=tiKUGfm8MShkmze_Zm2n6FomqGQJIweUX1BoeolrHhM-1677348402087-0-604800000; __cf_bm=7yprfFeamzefMgns0sR_ur7iyTQ1QdSZ8r5rhItZ2hM-1677521925-0-Ac2nLT5b6oCgpCW5OCvEowLoBra9LjtSsfuNG9IN7PvII2EnNsO8Ma1pFrY6L781L+JHR8Q1+0WpXZIORpMh8wU=; prodDetails={"products":{}}; XSRF-TOKEN=gdTdEmnJ-Wx1Tsa0ChBe82mfcAXX_kAOrnAo`,
	};

	return headers;
};
