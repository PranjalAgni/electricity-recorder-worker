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

interface ElectricityDataResponse {
	data: Array<BillData> | null;
	error: unknown;
}

interface AirtableRequestData {
	date: string;
	amount: string;
	time: string;
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
		let isSuccessRun = null;
		const [formattedDate, formattedTime] = getDateTime();
		const { data, error } = await gatherElectricityData(env);
		if (data === null || error !== null) {
			isSuccessRun = false;
			console.log(
				`${[formattedDate]} Failed to fetch electricity data from worker `,
				!isSuccessRun
			);
			return;
		}

		const amountIndex = getAmountIndex(data);
		if (amountIndex === -1) {
			isSuccessRun = false;
			return;
		}

		const airtableRecord: AirtableRequestData = {
			date: formattedDate,
			time: formattedTime,
			amount: data[amountIndex].value,
		};
		const { airtableError } = await submitAirtableHandler(airtableRecord, env);

		if (airtableError !== null) {
			isSuccessRun = false;
			console.log(
				`${[formattedDate]} Failed to push data to airtable `,
				airtableError
			);
			return;
		}

		isSuccessRun = true;
		console.log("Worker run status:  ", isSuccessRun);
	},
};

const getAmountIndex = (data: Array<BillData>) => {
	const findIndex = data.findIndex(
		(billData) => billData.label === "Main Balance"
	);

	return findIndex;
};

const convertDate = (dateString: string) => {
	// converts the date to mm-dd-yyy format
	const [day, month, year] = dateString.split("/");
	return `${month}/${day}/${year}`;
};

const getDateTime = () => {
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

	return [convertDate(formattedDate), formattedTime];
};

const submitAirtableHandler = async (
	requestData: AirtableRequestData,
	env: Env
) => {
	const { date, amount, time } = requestData;

	const reqBody = {
		fields: {
			Date: date,
			Amount: amount,
			"Time recorded": time,
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
		return { airtableData: null, airtableError: ex };
	}

	return { airtableData: "done", airtableError: null };
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
): Promise<ElectricityDataResponse> => {
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

	const data: PaytmResponse = await response.json();

	if (!response.ok) {
		console.error("Error fetching the electricity data: ", response.statusText);
		return {
			data: null,
			error: data,
		};
	}

	return {
		data: data.cart.cart_items[0].service_options.actions[0].displayValues,
		error: null,
	};
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
