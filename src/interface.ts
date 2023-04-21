export interface Env {
	AIRTABLE_API_KEY: string;
	AIRTABLE_TABLE_NAME: string;
	AIRTABLE_BASE_ID: string;
	"x-csrf-token": string;
	"x-xsrf-token": string;
	cookie: string;
}

export interface PaytmResponse {
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

export interface BillData {
	label: string;
	value: string;
}

export interface ElectricityDataResponse {
	data: Array<BillData> | null;
	error: unknown;
}

export interface AirtableRequestData {
	date: string;
	amount: string;
	time: string;
}

export interface Config {
	airtableName: string;
	airtableApiKey: string;
	airtableBaseId: string;
}
