import { EOLS } from "./enums";

export interface Options {
	componentName: string;
	includeFileExtension: boolean;
}

export interface NameTemplates {
	barrelName: () => string;
	styleName: (options: Options) => string;
	translationName: (options: Options) => string;
	testName: (options: Options) => string;
	componentName: (options: Options) => string;
}

export interface BarrelTemplates {
	barrelAll: (options: Options) => string;
	barrelNamed: (options: Options) => string;
	barrelDefault: (options: Options) => string;
}

export interface ResourceTemplates {
	style: (options: Options) => string;
	translation: (options: Options) => string;
	test: (options: Options) => string;
}

export interface ImportOptions extends Options {
	includeStyle: boolean;
	includeTranslation: boolean;
}

export interface ComponentOptions extends Options {
	includeStyle: boolean;
	includeTest: boolean;
}
export interface ComponentTemplates {
	componentImports: (options: ImportOptions) => string;
	componentAll: (options: ComponentOptions) => string;
	componentNamed: (options: ComponentOptions) => string;
	componentDefault: (options: ComponentOptions) => string;
}

class Templates
	implements
		BarrelTemplates,
		ComponentTemplates,
		ResourceTemplates,
		NameTemplates
{
	constructor(private eol: EOLS) {}

	public barrelName() {
		return `index.ts`;
	}

	public barrelAll({ componentName, includeFileExtension }: Options) {
		const name = this.componentName({
			componentName,
			includeFileExtension,
		});
		return `export * from "./${name}";${this.eol}`;
	}

	public barrelNamed({ componentName, includeFileExtension }: Options) {
		const name = this.componentName({
			componentName,
			includeFileExtension,
		});
		return `export { ${componentName} } from "./${name}";${this.eol}`;
	}

	public barrelDefault({ componentName, includeFileExtension }: Options) {
		const name = this.componentName({
			componentName,
			includeFileExtension,
		});
		return `export default from "./${name}.ts";${this.eol}`;
	}

	public styleName({ componentName, includeFileExtension }: Options) {
		if (includeFileExtension) {
			return `${componentName}.module.css`;
		}
		return `${componentName}.module.css`;
	}
	public style() {
		return `.root {}`;
	}

	public translationName({ componentName, includeFileExtension }: Options) {
		if (includeFileExtension) {
			return `${componentName}.translations.ts`;
		}
		return `${componentName}.translations`;
	}

	public translation() {
		return `export const translations = {};${this.eol}`;
	}

	public testName({ componentName, includeFileExtension }: Options) {
		if (includeFileExtension) {
			return `${componentName}.test.ts`;
		}
		return `${componentName}.test`;
	}

	public test() {
		const imports = [
			`import * as RTL from "@testing-library/react";`,
			`import * as React from "react";`,
			`import "@testing-library/jest-dom";`,
		].join(this.eol);
		return `${imports}${this.eol}${this.eol}test("If it works!", () => {});${this.eol}`;
	}

	public componentName({ componentName, includeFileExtension }: Options) {
		if (includeFileExtension) {
			return `${componentName}.tsx`;
		}
		return componentName;
	}

	public componentImports({
		includeStyle,
		includeTranslation,
		includeFileExtension,
		componentName,
	}: ImportOptions) {
		let result = `import * as React from "react";\n\n`;
		if (includeStyle) {
			const name = this.styleName({
				componentName,
				includeFileExtension,
			});
			result += `import styles from "./${name}";${this.eol}`;
		}

		if (includeTranslation) {
			const name = this.translationName({
				componentName,
				includeFileExtension,
			});
			result += `import { translations } from "./${name}";${this.eol}`;
		}

		if (!result) {
			return "";
		}
		return `${result}${this.eol}`;
	}

	public componentAll(options: ComponentOptions) {
		return this.componentNamed(options);
	}

	public componentNamed({
		componentName,
		includeTest,
		includeStyle,
	}: ComponentOptions) {
		let el = "<div";
		if (includeTest) {
			el += ` data-testId="${componentName}"`;
		}
		if (includeStyle) {
			el += ` className={styles.root}`;
		}
		el += " />";
		return `export function ${componentName}() {${this.eol}\treturn ${el};${this.eol}}${this.eol}`;
	}

	public componentDefault({
		componentName,
		includeTest,
		includeStyle,
	}: ComponentOptions) {
		let el = "<div";
		if (includeTest) {
			el += ` data-testId="${componentName}"`;
		}
		if (includeStyle) {
			el += ` className={styles.root}`;
		}
		el += " />";
		return `export default function ${componentName}() {${this.eol}\treturn ${el};${this.eol}}${this.eol}`;
	}
}

export default Templates;
