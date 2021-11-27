import { EOLS, ExportType } from "../../enums";
import type { Config } from "../config";

import { FileBase } from "./base";
import type { Child } from "./base";

export class Style extends FileBase {
	constructor(
		public readonly id: string,
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly children: Child[],
		protected readonly eol: EOLS,
		public readonly config: Config
	) {
		super(id, directory, moduleName, children, eol, config);
	}

	public get name() {
		return this.config.name
			? this.normalizeName(this.templateValues(this.config.name.trim()))
			: this.moduleName;
	}

	public get alias() {
		return this.config.alias || "style";
	}

	public get filename() {
		return this.generateFilename(this.config.exportExtension);
	}

	public get path() {
		return this.generatePath();
	}

	public get extension() {
		return this.normalizeExtension(this.config.extension);
	}

	public get exportType() {
		return this.config.exportType;
	}

	public get exportExtension() {
		return this.config.exportExtension ?? false;
	}

	public get content() {
		let result = "";
		for (const _import of this.config.imports) {
			result += `${_import}${this.eol}`;
		}
		for (const dependency of this.children) {
			if (dependency instanceof FileBase) {
				switch (dependency.exportType) {
					case ExportType.all:
						result += this.importAll(dependency);
						break;
					case ExportType.named:
						result += this.importNamed(dependency);
						break;
					case ExportType.default:
					default:
						result += this.importDefault(dependency);
						break;
				}
			}
		}
		if (result.length > 0) {
			result += this.eol;
		}
		result += `.root {${this.eol}}${this.eol}`;
		return result;
	}
}
