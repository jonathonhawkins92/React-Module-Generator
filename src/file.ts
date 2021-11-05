import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";

import templates from "./template";

export interface NewFileSettings {
	typescript: boolean;
	fileExtensions: boolean;
	includeStyle: boolean;
	includeTranslation: boolean;
	defaultImports: string[];
	exportType: "default" | "named" | "all";
	rootDirectory: string;
}

enum SettingIds {
	typescript = "typescript",
	fileExtensions = "fileExtensions",
	includeStyle = "includeStyle",
	includeTranslation = "includeTranslation",
}

export default class FileController {
	private settings: NewFileSettings;

	private currentUri?: vscode.Uri;

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
			includeStyle: config.get("includeStyle", false),
			includeTranslation: config.get("includeTranslation", false),
			defaultImports: config.get("defaultImports", [
				"import * as React from 'react';",
			]),
			exportType: config.get("exportType", "all"),
			rootDirectory: config.get("rootDirectory", ""),
		};

		return this;
	}

	public async add(targetDir?: string) {
		if (!targetDir) {
			targetDir = await this.getDir();
		}
		const root = await this.getRoot(targetDir);
		const { name, settings } = await this.getUserSettings();
		const { extension, reactExtension } = this.getExtension(
			settings.typescript
		);

		const componentName = this.normalizeComponentName(name);
		const componentFile = `${componentName}.${reactExtension}`;
		const componentFilename = settings.fileExtensions
			? componentFile
			: componentName;
		const componentPath = path.join(root, componentFile);

		const barrelFile = `index.${extension}`;
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
			componentFilename,
			{
				exportType,
			}
		);

		await fs.writeFile(barrelPath, barrelTemplate, { flag: "a+" });

		const componentTemplate = await this.generateComponentTemplate(
			componentName,
			componentFilename,
			{
				exportType,
			}
		);
		await fs.writeFile(componentPath, componentTemplate);

		const doc = await vscode.workspace.openTextDocument(componentPath);
		vscode.window.showTextDocument(doc);
	}

	public async create(targetDir?: string) {
		if (!targetDir) {
			targetDir = await this.getDir();
		}
		const root = await this.getRoot(targetDir);
		const { name, settings } = await this.getUserSettings();
		const { extension, reactExtension } = this.getExtension(
			settings.typescript
		);

		const dirName = this.normalizeDirName(name);
		const dirPath = path.join(root, dirName);

		const componentName = this.normalizeComponentName(name);
		const componentFile = `${componentName}.${reactExtension}`;
		const componentFilename = settings.fileExtensions
			? componentFile
			: componentName;
		const componentPath = path.join(dirPath, componentFile);
		const componentTemplate = await this.generateComponentTemplate(
			componentName,
			componentFilename,
			{
				exportType: this.settings.exportType,
			}
		);

		const barrelFile = `index.${extension}`;
		const barrelPath = path.join(dirPath, barrelFile);
		const barrelTemplate = await this.generateBarrelTemplate(
			componentName,
			componentFilename,
			{
				exportType: this.settings.exportType,
			}
		);

		await fs.mkdir(dirPath);
		await fs.writeFile(barrelPath, barrelTemplate);
		await fs.writeFile(componentPath, componentTemplate);

		const doc = await vscode.workspace.openTextDocument(componentPath);
		vscode.window.showTextDocument(doc);
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

	private async getUserSettings() {
		console.log(this.settings);
		console.log(this.settings.includeStyle);
		console.log(this.settings.includeTranslation);
		const settingsMap: Record<
			string,
			{
				quickPick: vscode.QuickPickItem;
				id: string;
			}
		> = {
			"Use TypeScript": {
				quickPick: {
					alwaysShow: true,
					label: "Use TypeScript",
					description:
						"Generate TypeScript files instead of Javascript files.",
					picked: this.settings.typescript,
				},
				id: SettingIds.typescript,
			},
			"Include file extensions": {
				quickPick: {
					alwaysShow: true,
					label: "Include file extensions",
					description:
						"Add the files extension to your barrel files export.",
					picked: this.settings.fileExtensions,
				},
				id: SettingIds.fileExtensions,
			},
			"Include styles": {
				quickPick: {
					alwaysShow: true,
					label: "Include styles",
					description:
						"Create a style file and import it in your component.",
					picked: this.settings.includeStyle,
				},
				id: SettingIds.includeStyle,
			},
			"Include translations": {
				quickPick: {
					alwaysShow: true,
					label: "Include translations",
					description:
						"Create a translation file and import it in your component.",
					picked: this.settings.includeTranslation,
				},
				id: SettingIds.includeTranslation,
			},
		};
		const settingsQuickPicks = Object.values(settingsMap).map(
			(value) => value.quickPick
		);

		const input = await vscode.window.createQuickPick();
		input.title = "Settings";
		input.placeholder = "What's the name of your new module?";
		input.matchOnDescription = false;
		input.matchOnDetail = false;
		input.items = settingsQuickPicks;
		input.canSelectMany = true;
		input.selectedItems = settingsQuickPicks.filter(
			(value) => value.picked
		);

		let name = "";
		let selectedIds: string[] = [];
		await new Promise((resolve, reject) => {
			let accepted = false;
			input.onDidChangeValue((value) => {
				name = value;
			});
			input.onDidAccept(() => {
				accepted = true;
				input.dispose();
				resolve(name);
			});
			input.onDidChangeSelection((selection) => {
				selectedIds = selection.map((item) => {
					const id = item.label;
					const setting = settingsMap[id];
					return setting.id;
				});
			});
			input.onDidHide(() => {
				if (accepted) {
					return;
				}
				reject("Input box hidden too early.");
			});
			input.show();
		});
		if (!name || !name.trim()) {
			throw new Error("Invalid module name");
		}
		const settings = {
			[SettingIds.typescript]: selectedIds.includes(
				SettingIds.typescript
			),
			[SettingIds.fileExtensions]: selectedIds.includes(
				SettingIds.fileExtensions
			),
			[SettingIds.includeStyle]: selectedIds.includes(
				SettingIds.includeStyle
			),
			[SettingIds.includeTranslation]: selectedIds.includes(
				SettingIds.includeTranslation
			),
		};
		return { name, settings };
	}

	private async getRoot(value?: string) {
		if (!value) {
			value = await this.determineWorkspaceRoot();
		}
		if (!value) {
			throw new Error("Unable to determine root");
		}
		return value;
	}

	private async getDir() {
		const directories = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
		});
		if (directories && directories.length > 0) {
			return directories[0].fsPath;
		}
		return this.settings.rootDirectory;
	}

	private getExtension(typescript: boolean) {
		if (typescript) {
			return {
				extension: "ts",
				reactExtension: "tsx",
			};
		} else {
			return {
				extension: "js",
				reactExtension: "jsx",
			};
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
		componentFilename: string,
		{
			exportType,
		}: {
			exportType: NewFileSettings["exportType"];
		}
	) {
		const options = {
			componentFilename,
			componentName,
		};
		const head = templates.componentImports({
			...options,
			imports: this.settings.defaultImports,
		});
		let body = "";
		switch (exportType) {
			case "all":
				body = templates.componentAll(options);
				break;
			case "named":
				body = templates.componentNamed(options);
				break;
			case "default":
			default:
				body = templates.componentAll(options);
				break;
		}

		return head + body;
	}
	private async generateBarrelTemplate(
		componentName: string,
		componentFilename: string,
		{
			exportType,
		}: {
			exportType: NewFileSettings["exportType"];
		}
	) {
		const options = {
			componentFilename,
			componentName,
		};
		let result = "";
		switch (exportType) {
			case "all":
				result = templates.barrelAll(options);
				break;
			case "named":
				result = templates.barrelNamed(options);
				break;
			case "default":
			default:
				result = templates.barrelDefault(options);
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
