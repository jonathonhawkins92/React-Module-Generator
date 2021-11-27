import { EOLS, ExportType } from "../../enums";
import type { Config } from "../config";

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
