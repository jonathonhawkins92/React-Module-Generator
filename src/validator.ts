import { ExportType } from "./enums";
import { FileBase, Settings } from "./template";

interface Template {
	directory: string;
	moduleName: string;
	dependencies: (string | FileBase)[];
	settings: Settings;
	eol: string;
	name: string;
	alias: string;
	path: string;
	directories: string[];
	filename: string;
	content: string;
	extension: string;
	exportType: ExportType;
	exportExtension: boolean;
}

enum Properties {
	// base
	directory = "directory",
	moduleName = "moduleName",
	dependencies = "dependencies",
	settings = "settings",
	eol = "eol",
	// core
	name = "name",
	alias = "alias",
	path = "path",
	directories = "directories",
	filename = "filename",
	content = "content",
	extension = "extension",
	exportType = "exportType",
	exportExtension = "exportExtension",
}

interface PossibleTemplate {
	// base
	[Properties.directory]?: string;
	[Properties.moduleName]?: string;
	[Properties.dependencies]?: (string | FileBase)[];
	[Properties.settings]?: Settings;
	[Properties.eol]?: string;
	// core
	[Properties.name]?: string;
	[Properties.alias]?: string;
	[Properties.path]?: string;
	[Properties.directories]?: string[];
	[Properties.filename]?: string;
	[Properties.content]?: string;
	[Properties.extension]?: string;
	[Properties.exportType]?: ExportType;
	[Properties.exportExtension]?: boolean;
}

class Validator {
	public static instance = new Validator();

	public assertTemplate(template: unknown) {
		return (
			this.assertPossibleTemplate(template) &&
			this.assertTemplateBase(template) &&
			this.assertTemplateCore(template)
		);
	}

	private isValid(template: PossibleTemplate, key: Properties, type: string) {
		return key in template && typeof template[key] === type;
	}

	// TODO: improve
	private isValidDependencies(template: PossibleTemplate, key: Properties) {
		return key in template && Array.isArray(template[key]);
	}

	// TODO: improve
	private isValidSetting(template: PossibleTemplate, key: Properties) {
		return key in template && typeof template[key] === "object";
	}

	private assertPossibleTemplate(
		template: unknown
	): template is PossibleTemplate {
		return (
			typeof template === "object" ||
			typeof template !== null ||
			!Array.isArray(template)
		);
	}

	private assertTemplateBase(template: PossibleTemplate) {
		return (
			this.isValid(template, Properties.directory, "string") &&
			this.isValid(template, Properties.moduleName, "string") &&
			this.isValidDependencies(template, Properties.dependencies) &&
			this.isValidSetting(template, Properties.settings) &&
			this.isValid(template, Properties.eol, "string")
		);
	}

	private assertTemplateCore(
		template: PossibleTemplate
	): template is Template {
		return (
			this.isValid(template, Properties.name, "string") &&
			this.isValid(template, Properties.alias, "string") &&
			this.isValid(template, Properties.path, "string") &&
			this.isValid(template, Properties.content, "string") &&
			this.isValid(template, Properties.filename, "string") &&
			this.isValid(template, Properties.extension, "string") &&
			this.isValid(template, Properties.exportType, "string") &&
			this.isValid(template, Properties.exportExtension, "boolean") &&
			Array.isArray(template.directories) &&
			template.directories.every(
				(directory) => typeof directory === "string"
			)
		);
	}
}

export default Validator.instance;
