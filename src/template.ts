import { EOLS, ExportMethod, ImportMethod } from "./enums";
import * as path from "path";

export interface File {
	get name(): string;
	get alias(): string;
	get path(): string;
	get filename(): string;
	get content(): string;
	get extension(): string;
}

export interface Settings {
	readonly endOfLineSequence: EOLS;
	readonly exportMethod: ExportMethod;
	readonly importMethod: ImportMethod;
	readonly includeFileExtension: boolean;

	readonly componentName?: string;
	readonly componentAlias?: string;
	readonly componentExtension: string;

	readonly includeBarrel: boolean;
	readonly barrelName?: string;
	readonly barrelAlias?: string;
	readonly barrelExtension: string;

	readonly includeStyle: boolean;
	readonly styleName?: string;
	readonly styleAlias?: string;
	readonly styleExtension: string;

	readonly includeTranslation: boolean;
	readonly translationName?: string;
	readonly translationAlias?: string;
	readonly translationExtension: string;

	readonly includeTest: boolean;
	readonly testName?: string;
	readonly testAlias?: string;
	readonly testExtension: string;
}

export type Dependency = string | FileBase;

class FileBase implements File {
	protected readonly eol: EOLS;
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly dependencies: Dependency[],
		protected readonly settings: Settings
	) {
		this.eol = settings.endOfLineSequence;
	}
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

	public get extension() {
		return "";
	}

	public get filename() {
		return "";
	}

	protected normalizeExtension(extension: string) {
		if (extension.startsWith(".")) {
			return extension;
		}
		return `.${extension}`;
	}

	protected removeExtension(extension: string) {
		const extensionIndex = extension.lastIndexOf(".");
		return extension.substring(0, extensionIndex);
	}

	protected generateFilename() {
		if (this.settings.includeFileExtension) {
			return `${this.name}${this.extension}`;
		}
		return `${this.name}${this.removeExtension(this.extension)}`;
	}

	protected generatePath() {
		return path.join(this.directory, `${this.name}${this.extension}`);
	}
}

export class Barrel extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly dependencies: Dependency[],
		protected readonly settings: Settings
	) {
		super(directory, moduleName, dependencies, settings);
	}

	public get name() {
		return this.settings.barrelName || this.moduleName;
	}

	public get alias() {
		return this.settings.barrelAlias || "barrel";
	}

	public get filename() {
		return this.generateFilename();
	}

	public get path() {
		return this.generatePath();
	}

	public get extension() {
		return this.normalizeExtension(this.settings.barrelExtension);
	}

	public get content() {
		let result = "";
		switch (this.settings.exportMethod) {
			case ExportMethod.all:
				for (const dependency of this.dependencies) {
					if (dependency instanceof FileBase) {
						result += this.exportAll(dependency.filename);
					}
					if (typeof dependency === "string") {
						result += `${dependency}${this.eol}`;
					}
				}
				break;
			case ExportMethod.named:
				for (const dependency of this.dependencies) {
					if (dependency instanceof FileBase) {
						result += this.exportNamed(
							dependency.name,
							dependency.filename
						);
					}
					if (typeof dependency === "string") {
						result += `${dependency}${this.eol}`;
					}
				}
				break;
			case ExportMethod.defaultNamed:
				for (const dependency of this.dependencies) {
					if (dependency instanceof FileBase) {
						result += this.exportDefaultNamed(
							dependency.name,
							dependency.filename
						);
					}
					if (typeof dependency === "string") {
						result += `${dependency}${this.eol}`;
					}
				}
				break;
			case ExportMethod.default:
			default:
				for (const dependency of this.dependencies) {
					if (dependency instanceof FileBase) {
						result += this.exportDefault(dependency.filename);
					}
					if (typeof dependency === "string") {
						result += `${dependency}${this.eol}`;
					}
				}
				break;
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
		protected readonly dependencies: Dependency[],
		protected readonly settings: Settings
	) {
		super(directory, moduleName, dependencies, settings);
	}

	public get name() {
		return this.settings.styleName || this.moduleName;
	}

	public get alias() {
		return this.settings.styleAlias || "style";
	}

	public get filename() {
		return this.generateFilename();
	}

	public get path() {
		return this.generatePath();
	}

	public get extension() {
		return this.normalizeExtension(this.settings.styleExtension);
	}

	public get content() {
		return `.root {\n}\n`;
	}
}

export class Translation extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly dependencies: Dependency[],
		protected readonly settings: Settings
	) {
		super(directory, moduleName, dependencies, settings);
	}

	public get name() {
		return this.settings.translationName || this.moduleName;
	}

	public get alias() {
		return this.settings.translationAlias || "translation";
	}

	public get filename() {
		return this.generateFilename();
	}

	public get path() {
		return this.generatePath();
	}

	public get extension() {
		return this.normalizeExtension(this.settings.translationExtension);
	}

	public get content() {
		return `export const translations = {};\n`;
	}
}

export class Test extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly dependencies: Dependency[],
		protected readonly settings: Settings
	) {
		super(directory, moduleName, dependencies, settings);
	}

	public get name() {
		return this.settings.testName || this.moduleName;
	}

	public get alias() {
		return this.settings.testAlias || "test";
	}

	public get filename() {
		return this.generateFilename();
	}

	public get path() {
		return this.generatePath();
	}

	public get extension() {
		return this.normalizeExtension(this.settings.testExtension);
	}

	public get content() {
		const imports = [
			`import * as RTL from "@testing-library/react";`,
			`import * as React from "react";`,
			`import "@testing-library/jest-dom";`,
		].join(this.eol);
		return `${imports}${this.eol}${this.eol}test("If it works!", () => {});${this.eol}`;
	}
}

export class Component extends FileBase {
	constructor(
		protected readonly directory: string,
		protected readonly moduleName: string,
		protected readonly dependencies: Dependency[],
		protected readonly settings: Settings
	) {
		super(directory, moduleName, dependencies, settings);
	}

	public get name() {
		return this.settings.componentName || this.moduleName;
	}

	public get alias() {
		return this.settings.componentAlias || "component";
	}

	public get filename() {
		return this.generateFilename();
	}

	public get path() {
		return this.generatePath();
	}

	public get extension() {
		return this.normalizeExtension(this.settings.componentExtension);
	}

	public get content() {
		let result = "";
		switch (this.settings.importMethod) {
			case ImportMethod.all:
			case ImportMethod.named:
				result += this.importNamed();
				break;
			case ImportMethod.default:
			default:
				result += this.importDefault();
				break;
		}
		switch (this.settings.exportMethod) {
			case ExportMethod.all:
			case ExportMethod.named:
				result += this.exportNamed();
				break;
			case ExportMethod.default:
			default:
				result += this.exportDefault();
				break;
		}
		return result;
	}

	private importNamed() {
		let result = ``;
		for (const dependency of this.dependencies) {
			if (dependency instanceof FileBase) {
				result += `import * as ${dependency.alias} from "./${dependency.filename}";${this.eol}`;
			}
			if (typeof dependency === "string") {
				result += `${dependency}${this.eol}`;
			}
		}
		return result ? `${result}${this.eol}` : "";
	}

	private importDefault() {
		let result = ``;
		for (const dependency of this.dependencies) {
			if (dependency instanceof FileBase) {
				result += `import ${dependency.alias} from "./${dependency.filename}";${this.eol}`;
			}
			if (typeof dependency === "string") {
				result += `${dependency}${this.eol}`;
			}
		}
		return result ? `${result}${this.eol}` : "";
	}

	private exportNamed() {
		let el = "<div";
		if (this.settings.includeTest) {
			el += ` data-testId="${this.moduleName}"`;
		}
		if (this.settings.includeStyle) {
			el += ` className={${this.settings.styleAlias || "style"}.root}`;
		}
		el += " />";
		return `export function ${this.moduleName}() {${this.eol}\treturn ${el};${this.eol}}${this.eol}`;
	}

	private exportDefault() {
		let el = "<div";
		if (this.settings.includeTest) {
			el += ` data-testId="${this.moduleName}"`;
		}
		if (this.settings.includeStyle) {
			el += ` className={${this.settings.styleAlias || "style"}.root}`;
		}
		el += " />";
		return `export default function ${this.moduleName}() {${this.eol}\treturn ${el};${this.eol}}${this.eol}`;
	}
}
