import {
	AirtableRequestData,
	BillData,
	Config,
	ElMeasureResponse,
	ElectricityDataResponse,
	Env,
	PaytmResponse,
} from "./interface";

let logs: Array<string[]> = [];
let logPusher: null | ReturnType<typeof logPush> = null;

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		logs = [];
		const startTime = new Date().getTime();

		logPusher = logPush(logs, startTime)!;
		logPusher("Worker started running");
		const { searchParams } = new URL(request.url);
		const isAirtableStore =
			searchParams.get("airtable") === "true" ? true : false;
		let isSuccessRun = null;
		const [formattedDate, formattedTime] = getDateTime();
		const { data, error } = await fetchElectricityDataFromElMeasure(env);

		if (data === null || error !== null) {
			isSuccessRun = false;
			return prepareResponse(logs, isSuccessRun);
		}

		// const amountIndex = getAmountIndex(data);
		// if (amountIndex === -1) {
		// 	isSuccessRun = false;
		// 	logPusher("Electricity amount not present in PaytmAPI :(", true);
		// 	return prepareResponse(logs, isSuccessRun);
		// } else {
		// 	logPusher("Yay extracted electricity balance from json data");
		// }

		const balance = String(data);
		if (isAirtableStore) {
			const airtableRecord: AirtableRequestData = {
				date: formattedDate,
				time: formattedTime,
				amount: balance,
			};
			const { airtableError } = await submitAirtableHandler(
				airtableRecord,
				env
			);

			if (airtableError !== null) {
				isSuccessRun = false;
				return prepareResponse(logs, isSuccessRun);
			}
		}

		isSuccessRun = true;
		const timeTaken = new Date().getTime() - startTime;
		logPusher(`Worker took ${timeTaken}ms to complete`);
		return prepareResponse(logs, isSuccessRun, balance);
	},
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

	logPusher!("Successfully generated date and time");
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

	logPusher!("Making network request to Airtable");
	try {
		const response = await createAirtableRecord(reqBody, config);
		const data = await response.json();
		if (!response.ok) {
			throw new Error(JSON.stringify(data, null, 3));
		}
	} catch (ex: unknown) {
		logPusher!(`Error occured when writing to Airtable ${ex}`, true);
		return { airtableData: null, airtableError: ex };
	}

	logPusher!("Electricity balance has been successfully updated on Airtable");
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

const fetchElectricityDataFromElMeasure = async (env: Env) => {
	const API_URL = "http://183.83.218.132:8091/api/Dashboard/HomeData";
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${env.ELMEASURE_TOKEN}`,
	};

	try {
		const response = await fetch(API_URL, {
			method: "POST",
			headers,
			body: JSON.stringify({
				InputType: "oXLjqdCNoKGT4cnWSN1WZslfxBgP2Fl2uWt0/dIswOI=",
			}),
		});

		const data = (await response.json()) as ElMeasureResponse;

		console.log(JSON.stringify(data, null, 3));

		if (!response.ok) {
			return {
				data: null,
				error: data,
			};
		}

		return {
			data: data.Data.MeterBal,
			error: null,
		};
	} catch (ex) {
		const error = ex as Error;
		console.error(error.message);
		return {
			error,
			data: null,
		};
	}
};

/** 
 * Date: 2023-06-24 Time: 11:20:00 PM
 * Not using this function anymore, as got a better way to fetch the balance using ElMeasure App
 * Used mitmproxy to identify the API calls which ElMeasure app was doing and using the same API to fetch the balance
 * 
const gatherElectricityData = async (
	env: Env
): Promise<ElectricityDataResponse> => {
	const API_URL = constructPaytmUrl();
	const opts = getPaytmHeaders(env);
	logPusher!("Requesting Paytm API now");
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
		logPusher!(
			`Error fetching balance from Paytm API: ${response.statusText}`,
			true
		);
		return {
			data: null,
			error: data,
		};
	}

	logPusher!("Successfully fetched electricity data using Paytm API");
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

const getAmountIndex = (data: Array<BillData>) => {
	const findIndex = data.findIndex(
		(billData) => billData.label === "Main Balance"
	);

	return findIndex;
};
*/

const logPush =
	(logs: Array<string[]>, startTime: number) =>
	(message: string, isError = false) => {
		const endTime = new Date().getTime();
		const timeTakenInMs = `${endTime - startTime}ms`;
		logs.push([message, timeTakenInMs]);
		if (isError) console.error(message);
		else console.log(message);
	};

const prepareResponse = (
	logs: Array<string[]>,
	isSuccessRun: boolean,
	amount?: string
) => {
	const init = {
		headers: {
			"content-type": "application/json;charset=UTF-8",
		},
	};

	return new Response(
		JSON.stringify({
			isSuccess: isSuccessRun,
			logs,
			balance: amount,
		}),
		init
	);
};
