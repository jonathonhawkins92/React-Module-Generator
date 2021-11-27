import { ExportType } from "../enums";

export interface Config {
	readonly include: boolean;
	readonly name?: string;
	readonly alias?: string;
	readonly imports: string[];
	readonly extension: string;
	readonly exportType: ExportType;
	readonly exportExtension: boolean;
}
