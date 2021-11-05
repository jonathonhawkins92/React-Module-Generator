import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";

export interface NewFileSettings {
	typescript: boolean;
	fileExtensions: boolean;
	defaultImports: string[];
	defaultModuleName: string;
	exportType: "default" | "named" | "all";
	rootDirectory: string;
}

export default class FileController {
	private settings: NewFileSettings;

	private currentUri?: vscode.Uri;
	private extension: string;
	private reactExtension: string;

	constructor(currentUri?: vscode.Uri) {
		this.currentUri = currentUri ?? this.getUriOfCurrentFile();
		const config = vscode.workspace.getConfiguration(
			"rmg",
			this.currentUri
		);

		const rootDirectory = this.homeDir();
		if (!rootDirectory) {
			throw new Error("unable to determine root directory");
		}

		this.settings = {
			typescript: config.get("typescript", false),
			fileExtensions: config.get("fileExtensions", false),
			defaultImports: config.get("defaultImports", [
				"import * as React from 'react';",
			]),
			defaultModuleName: config.get("defaultModuleName", "ModuleName"),
			exportType: config.get("exportType", "all"),
			rootDirectory: config.get("rootDirectory", ""),
		};
		if (this.settings.typescript) {
			this.extension = `ts`;
			this.reactExtension = `tsx`;
		} else {
			this.extension = `js`;
			this.reactExtension = `jsx`;
		}

		return this;
	}

	private async getRoot(value?: string) {
		let result: string | undefined = value || this.settings.rootDirectory;
		if (!result) {
			result = await this.determineWorkspaceRoot();
		}
		if (!result) {
			throw new Error("Unable to determine root");
		}
		return result;
	}

	private async getUserInput({
		prompt,
		value,
		error,
		select = true,
	}: {
		prompt: string;
		value: string;
		error: string;
		select?: boolean;
	}) {
		let valueSelection: undefined | [number, number];
		if (select) {
			valueSelection = [
				value.lastIndexOf(path.sep) + 1,
				value.lastIndexOf("."),
			];
		}
		let result = await vscode.window.showInputBox({
			prompt,
			value,
			valueSelection,
		});
		if (!result) {
			throw new Error(error);
		}
		return result;
	}

	private getModuleName() {
		return this.getUserInput({
			prompt: "What's the name of your new module?",
			value: this.settings.defaultModuleName,
			error: "Invalid file path",
		});
	}

	private async add(explorerRootDirectory?: string) {
		const root = await this.getRoot(explorerRootDirectory);
		const name = await this.getModuleName();

		const componentName = this.normalizeComponentName(name);
		const componentFile = `${componentName}.${this.reactExtension}`;
		const componentExportPath = this.settings.fileExtensions
			? componentFile
			: componentName;
		const componentPath = path.join(root, componentFile);

		const barrelFile = `index.${this.extension}`;
		const barrelPath = path.join(root, barrelFile);
		const isBarrel = await fs.stat(barrelPath);
		if (!isBarrel.isFile()) {
			throw new Error("Unable to find barrel.");
		}

		let exportType = this.settings.exportType;
		if (this.settings.exportType === "default") {
			exportType = "named";
		}
		const barrelTemplate = await this.generateBarrelTemplate(
			componentName,
			componentExportPath,
			{
				exportType,
			}
		);

		await fs.writeFile(barrelPath, `\n${barrelTemplate}`, { flag: "a+" });

		const componentTemplate = await this.generateComponentTemplate(
			componentName,
			{
				defaultImports: this.settings.defaultImports,
				exportType,
			}
		);
		await fs.writeFile(componentPath, componentTemplate);

		vscode.window.showInformationMessage(componentPath);
	}

	public async create(explorerRootDirectory?: string) {
		const root = await this.getRoot(explorerRootDirectory);
		const name = await this.getModuleName();

		const dirName = this.normalizeDirName(name);
		const dirPath = path.join(root, dirName);

		const componentName = this.normalizeComponentName(name);
		const componentFile = `${componentName}.${this.reactExtension}`;
		const componentExportPath = this.settings.fileExtensions
			? componentFile
			: componentName;
		const componentPath = path.join(dirPath, componentFile);
		const componentTemplate = await this.generateComponentTemplate(
			componentName,
			{
				defaultImports: this.settings.defaultImports,
				exportType: this.settings.exportType,
			}
		);

		const barrelFile = `index.${this.extension}`;
		const barrelPath = path.join(dirPath, barrelFile);
		const barrelTemplate = await this.generateBarrelTemplate(
			componentName,
			componentExportPath,
			{
				exportType: this.settings.exportType,
			}
		);

		await fs.mkdir(dirPath);
		await fs.writeFile(barrelPath, barrelTemplate);
		await fs.writeFile(componentPath, componentTemplate);

		vscode.window.showInformationMessage(componentPath);
	}

	public async explorerCreate(filePath: string) {
		const normalizedFilePath = this.tidyDir(filePath);
		const stats = await fs.lstat(normalizedFilePath);
		if (stats.isDirectory()) {
			this.create(normalizedFilePath);
		} else {
			this.create(path.dirname(normalizedFilePath));
		}
	}

	public async explorerAdd(filePath: string) {
		const normalizedFilePath = this.tidyDir(filePath);
		const stats = await fs.lstat(normalizedFilePath);
		if (stats.isDirectory()) {
			this.add(normalizedFilePath);
		} else {
			this.add(path.dirname(normalizedFilePath));
		}
	}

	private normalizeName(value: string, delimiter: string) {
		return value
			.split(/(?=[A-Z0-9])/) // split out all the numbers and capitalized words
			.join(delimiter) // recreate the string with numbers and capitalized words spaced out
			.replace(/[^A-Za-z0-9]/g, delimiter) // replace all non alphanumeric characters
			.split(delimiter) // create an array of entries
			.filter(Boolean); // remove empty entries
	}

	private normalizeDirName(value: string) {
		const delimiter = "-";
		return this.normalizeName(value, delimiter)
			.join(delimiter) // recreate the string
			.toLowerCase();
	}

	private normalizeComponentName(value: string) {
		const delimiter = "-";
		let result = "";
		for (const chunk of this.normalizeName(value, delimiter)) {
			result += chunk[0].toUpperCase() + chunk.slice(1);
		}
		return result;
	}

	private async generateComponentTemplate(
		componentName: string,
		{
			defaultImports = [],
			exportType,
		}: {
			defaultImports: string[];
			exportType: NewFileSettings["exportType"];
		}
	) {
		let result = "";
		switch (exportType) {
			case "all":
			case "named":
				result = `export function ${componentName}() {\n\treturn <div />;\n};`;
				break;
			case "default":
			default:
				result = `function ${componentName}() {\n\treturn <div />;\n};\n\nexport default ${componentName};`;
				break;
		}

		if (defaultImports.length > 0) {
			const imports = defaultImports.join("\n");
			if (imports.trim()) {
				result = `${imports}\n\n${result}`;
			}
		}
		return result;
	}
	private async generateBarrelTemplate(
		componentName: string,
		componentExportPath: string,
		{
			exportType,
		}: {
			exportType: NewFileSettings["exportType"];
		}
	) {
		let result = "";
		switch (exportType) {
			case "all":
				result = `export * from './${componentExportPath}';`;
				break;
			case "named":
				result = `export { ${componentName} } from './${componentExportPath}';`;
				break;
			case "default":
			default:
				result = `export { default } from './${componentExportPath}';`;
				break;
		}
		return result;
	}

	private getUriOfCurrentFile() {
		const editor = vscode.window.activeTextEditor;
		return editor ? editor.document.uri : undefined;
	}

	private homeDir() {
		return process.env[
			process.platform === "win32" ? "USERPROFILE" : "HOME"
		];
	}

	private tidyDir(dir: string) {
		if (process.platform !== "win32") {
			return dir;
		}
		if (dir[0] === "/") {
			return dir.slice(1);
		}
		return dir;
	}

	private async determineWorkspaceFolder(currentUri?: vscode.Uri) {
		if (currentUri) {
			return vscode.workspace.getWorkspaceFolder(currentUri);
		}

		return await vscode.window.showWorkspaceFolderPick();
	}

	private getRootPathFromWorkspace(
		currentWorkspace?: vscode.WorkspaceFolder
	) {
		if (typeof currentWorkspace === "undefined") {
			return undefined;
		}

		if (currentWorkspace.uri.scheme !== "file") {
			return null;
		}

		return currentWorkspace.uri.fsPath;
	}

	private async determineWorkspaceRoot() {
		const currentWorkspace = await this.determineWorkspaceFolder(
			this.currentUri
		);
		const workspaceRoot = this.getRootPathFromWorkspace(currentWorkspace);
		if (workspaceRoot === null) {
			throw new Error(
				"This extension currently only support file system workspaces."
			);
		}
		return workspaceRoot;
	}
}
