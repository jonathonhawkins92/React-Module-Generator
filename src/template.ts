export interface Options {
	componentName: string;
	componentFilename: string;
}

export interface BarrelTemplates {
	barrelAll: (options: Options) => string;
	barrelNamed: (options: Options) => string;
	barrelDefault: (options: Options) => string;
}

interface ImportOptions extends Options {
	imports: string[];
}
export interface ComponentTemplates {
	componentImports: (options: ImportOptions) => string;
	componentAll: (options: Options) => string;
	componentNamed: (options: Options) => string;
	componentDefault: (options: Options) => string;
}

export interface ResourceTemplates {
	style: (options: Options) => string;
	translation: (options: Options) => string;
}

class Templates
	implements BarrelTemplates, ComponentTemplates, ResourceTemplates
{
	public barrelAll({ componentFilename }: Options) {
		return `export * from "./${componentFilename}";\n`;
	}

	public barrelNamed({ componentName, componentFilename }: Options) {
		return `export { ${componentName} } from "./${componentFilename}";\n`;
	}

	public barrelDefault({ componentFilename }: Options) {
		return `export default from "./${componentFilename}";\n`;
	}

	public componentImports({ imports }: ImportOptions) {
		return imports.join("\n") + `\n\n`;
	}

	public componentAll(options: Options) {
		return this.componentNamed(options);
	}

	public componentNamed({ componentName }: Options) {
		return `export function ${componentName}() {\n\treturn <div />;\n}\n`;
	}

	public componentDefault({ componentName }: Options) {
		return `export function ${componentName}() {\n\treturn <div />;\n}\n`;
	}

	public style() {
		return `.root {}`;
	}

	public translation() {
		return `export const translations = {};`;
	}
}

export default new Templates();
