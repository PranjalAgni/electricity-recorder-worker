export interface Env {
	AIRTABLE_API_KEY: string;
	AIRTABLE_TABLE_NAME: string;
	AIRTABLE_BASE_ID: string;
	"x-csrf-token": string;
	"x-xsrf-token": string;
	cookie: string;
}

interface PaytmResponse {
	cart: {
		cart_items: {
			service_options: {
				actions: {
					displayValues: BillData[];
				}[];
			};
		}[];
	};
}
interface BillData {
	label: string;
	value: string;
}

interface Config {
	airtableName: string;
	airtableApiKey: string;
	airtableBaseId: string;
}

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const data = await gatherElectricityData(env);
		if (data === null) return;
		const amountIndex = getAmountIndex(data);
		if (amountIndex === -1) return;

		await submitAirtableHandler(data[amountIndex].value, env);
	},
};

const getAmountIndex = (data: Array<BillData>) => {
	const findIndex = data.findIndex(
		(billData) => billData.label === "Main Balance"
	);

	return findIndex;
};

const submitAirtableHandler = async (amount: string, env: Env) => {
	const [formattedDate, formattedTime] = new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
		.format(new Date())
		.split(", ");

	const reqBody = {
		fields: {
			Date: formattedDate,
			Amount: amount,
			"Time recorded": formattedTime,
		},
	};

	const config: Config = {
		airtableName: env.AIRTABLE_TABLE_NAME,
		airtableApiKey: env.AIRTABLE_API_KEY,
		airtableBaseId: env.AIRTABLE_BASE_ID,
	};

	try {
		const response = await createAirtableRecord(reqBody, config);
		const data = await response.json();
		if (!response.ok) {
			throw new Error(JSON.stringify(data, null, 3));
		}
	} catch (ex: unknown) {
		console.error("Failed writing to airtable: ", ex);
	}
};

const createAirtableRecord = (body: any, config: Config) => {
	return fetch(
		`https://api.airtable.com/v0/${config.airtableBaseId}/${encodeURIComponent(
			config.airtableName
		)}`,
		{
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				Authorization: `Bearer ${config.airtableApiKey}`,
				"Content-type": `application/json`,
			},
		}
	);
};

const gatherElectricityData = async (
	env: Env
): Promise<Array<BillData> | null> => {
	const API_URL = constructPaytmUrl();
	const opts = getPaytmHeaders(env);
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

	if (!response.ok) {
		console.error("Error fetching the electricity data: ", response.statusText);
		return null;
	}

	const data: PaytmResponse = await response.json();
	return data.cart.cart_items[0].service_options.actions[0].displayValues;
};

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

const getPaytmHeaders = (env: Env) => {
	const headers = {
		"user-agent": "cloudflare-worker",
		"content-type": "application/json",
		"x-csrf-token": env["x-csrf-token"],
		"x-xsrf-token": env["x-xsrf-token"],
		cookie: env.cookie,
	};

	return headers;
};
