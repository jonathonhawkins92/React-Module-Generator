import { ExportType } from "../enums";
import type { Child } from "./base";
import type { Config } from "./types";

enum Properties {
	// base
	directory = "directory",
	moduleName = "moduleName",
	children = "children",
	config = "config",
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
	[Properties.children]?: Child[];
	[Properties.config]?: Config;
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

export type Template = Required<PossibleTemplate>;

class TemplateValidator {
	public static instance = new TemplateValidator();

	public assert<Template>(template: Template) {
		return (
			this.assertPossibleTemplate(template) &&
			this.assertTemplateBase(template) &&
			this.assertTemplateCore(template)
		);
	}

	private isValid(template: PossibleTemplate, key: Properties, type: string) {
		return (
			template !== null &&
			key in template &&
			typeof template[key] === type
		);
	}

	// TODO: improve
	private isValidChildren(template: PossibleTemplate, key: Properties) {
		return (
			template !== null && key in template && Array.isArray(template[key])
		);
	}

	// TODO: improve
	private isValidConfig(template: PossibleTemplate, key: Properties) {
		return (
			template !== null &&
			key in template &&
			typeof template[key] === "object"
		);
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
			this.isValidChildren(template, Properties.children) &&
			this.isValidConfig(template, Properties.config) &&
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

export const templateValidator = TemplateValidator.instance;
