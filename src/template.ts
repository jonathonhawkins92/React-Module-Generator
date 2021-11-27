import { EOLS, ExportType } from "./enums";
import * as path from "path";

export interface File {
	get name(): string;
	get alias(): string;
	get path(): string;
	get directories(): string[];
	get filename(): string;
	get content(): string;
	get extension(): string;
	get exportType(): ExportType;
	get exportExtension(): boolean;
}

export interface Config {
	readonly include: boolean;
	readonly name?: string;
	readonly alias?: string;
	readonly imports: string[];
	readonly extension: string;
	readonly exportType: ExportType;
	readonly exportExtension: boolean;
}

export type Child = string | FileBase;

export class FileBase implements File {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly children: Child[],
		protected readonly eol: EOLS,
		public readonly config: Config
	) {}
	public get name() {
		return "";
	}

	public get alias() {
		return "";
	}

	public get path() {
		return "";
	}

	public get content() {
		return "";
	}

	public get directories() {
		return this.generateDirectories();
	}

	public get filename() {
		return "";
	}

	public get extension() {
		return "";
	}

	public get exportType() {
		return ExportType.all;
	}

	public get exportExtension() {
		return false;
	}

	protected normalizeExtension(extension: string) {
		if (extension.startsWith(".")) {
			return extension;
		}
		return `.${extension}`;
	}

	protected normalizeName(name: string) {
		const delimiters = { windows: "\\", unix: "/" };
		if (name.includes(delimiters.unix) && process.platform === "win32") {
			return name.replace(`/${delimiters.unix}/g"`, delimiters.windows);
		} else if (
			name.includes(delimiters.windows) &&
			process.platform !== "win32"
		) {
			return name.replace(`/${delimiters.windows}/g"`, delimiters.unix);
		}
		return name;
	}

	protected removeExtension(extension: string) {
		const extensionIndex = extension.lastIndexOf(".");
		return extension.substring(0, extensionIndex);
	}

	protected generateDirectories() {
		const delimiters = { windows: "\\", unix: "/" };
		let chunks: string[] = [];
		if (this.name.includes(delimiters.windows)) {
			chunks = this.name.split(delimiters.windows);
			return chunks.slice(0, chunks.length - 1);
		}
		if (this.name.includes(delimiters.unix)) {
			chunks = this.name.split(delimiters.unix);
			return chunks.slice(0, chunks.length - 1);
		}
		return chunks;
	}

	protected generateFilename(fileExtension: boolean) {
		if (fileExtension) {
			return `${this.name}${this.extension}`;
		}
		return `${this.name}${this.removeExtension(this.extension)}`;
	}

	protected generatePath() {
		return path.join(this.directory, `${this.name}${this.extension}`);
	}

	protected templateValues(name: string) {
		return name.replace("{{moduleName}}", this.moduleName);
	}

	protected relativeParents() {
		let levels = "./";
		if (this.directories.length > 0) {
			levels = "";
			for (let index = 0; index < this.directories.length; index++) {
				levels += `../`;
			}
		}
		return levels;
	}

	protected importNamed(dependency: FileBase) {
		const relativeParents = this.relativeParents();
		return `import { ${dependency.alias} } from "${relativeParents}${dependency.filename}";${this.eol}`;
	}

	protected importAll(dependency: FileBase) {
		const relativeParents = this.relativeParents();
		return `import * as ${dependency.alias} from "${relativeParents}${dependency.filename}";${this.eol}`;
	}

	protected importDefault(dependency: FileBase) {
		const relativeParents = this.relativeParents();
		return `import ${dependency.alias} from "${relativeParents}${dependency.filename}";${this.eol}`;
	}
}

export class Barrel extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly children: Child[],
		protected readonly eol: EOLS,
		public readonly config: Config
	) {
		super(directory, moduleName, children, eol, config);
	}

	public get name() {
		return this.config.name
			? this.normalizeName(this.templateValues(this.config.name.trim()))
			: this.moduleName;
	}

	public get alias() {
		return this.config.alias || "barrel";
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
		if (result.length > 0) {
			result += this.eol;
		}
		for (const dependency of this.children) {
			if (dependency instanceof FileBase) {
				switch (dependency.exportType) {
					case ExportType.all:
						result += this.exportAll(dependency.filename);
						break;
					case ExportType.named:
						result += this.exportNamed(
							dependency.name,
							dependency.filename
						);
						break;

					case ExportType.defaultNamed:
						result += this.exportDefaultNamed(
							dependency.name,
							dependency.filename
						);
						break;
					case ExportType.default:
					default:
						result += this.exportDefaultNamed(
							dependency.name,
							dependency.filename
						);
						break;
				}
			}
		}
		return result;
	}

	private exportAll(filename: string) {
		return `export * from "./${filename}";${this.eol}`;
	}

	private exportNamed(name: string, filename: string) {
		return `export { ${name} } from "./${filename}";${this.eol}`;
	}

	private exportDefault(filename: string) {
		return `export { default } from "./${filename}";${this.eol}`;
	}

	private exportDefaultNamed(name: string, filename: string) {
		return `export { default as ${name} } from "./${filename}";${this.eol}`;
	}
}

export class Style extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly children: Child[],
		protected readonly eol: EOLS,
		public readonly config: Config
	) {
		super(directory, moduleName, children, eol, config);
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

export class Translation extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly children: Child[],
		protected readonly eol: EOLS,
		public readonly config: Config
	) {
		super(directory, moduleName, children, eol, config);
	}
	public get name() {
		return this.config.name
			? this.normalizeName(this.templateValues(this.config.name.trim()))
			: this.moduleName;
	}

	public get alias() {
		return this.config.alias || "translation";
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
		result += `export const ${this.alias} = {};${this.eol}`;
		return result;
	}
}

export class Test extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly children: Child[],
		protected readonly eol: EOLS,
		public readonly config: Config
	) {
		super(directory, moduleName, children, eol, config);
	}
	public get name() {
		return this.config.name
			? this.normalizeName(this.templateValues(this.config.name.trim()))
			: this.moduleName;
	}

	public get alias() {
		return this.config.alias || "test";
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
		result += `test("If it works!", () => {});${this.eol}`;
		return result;
	}
}

export class Component extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly children: Child[],
		protected readonly eol: EOLS,
		public readonly config: Config
	) {
		super(directory, moduleName, children, eol, config);
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
		// TODO: implement via children
		// if (this.settings.test) {
		// 	el += ` data-testId="${this.moduleName}"`;
		// }
		// if (this.settings.style) {
		// 	el += ` className={${this.settings.styleAlias || "style"}.root}`;
		// }
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
