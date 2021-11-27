import { FileBase, EOLS, ExportType } from "@file-generator/core";
import type { Child, Config } from "@file-generator/core";

export class Component extends FileBase {
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
		return this.config.alias || "component";
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
		switch (this.exportType) {
			case ExportType.all:
			case ExportType.named:
				result += this.exportNamed();
				break;
			case ExportType.default:
			default:
				result += this.exportDefault();
				break;
		}
		return result;
	}

	private createDiv() {
		let el = "<div";
		const includes = {
			test: false,
			style: false,
		};
		for (const child of this.children) {
			if (typeof child === "string") {
				continue;
			}
			if (!includes.test && child.id === "test") {
				includes.test = true;
				el += ` data-testId="${this.moduleName}"`;
			}
			if (!includes.style && child.id === "style") {
				includes.style = true;
				el += ` className={${child.alias}.root}`;
			}
		}
		el += " ></div>";
		return el;
	}

	private createRender() {
		return `\treturn (${this.eol}\t\t${this.createDiv()}${this.eol}\t);`;
	}

	private exportNamed() {
		const render = this.createRender();
		return `export function ${this.moduleName}() {${this.eol}${render}${this.eol}}${this.eol}`;
	}

	private exportDefault() {
		const render = this.createRender();
		return `export default function ${this.moduleName}() {${this.eol}${render}${this.eol}}${this.eol}`;
	}
}
