import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";

import Templates from "./template";
import { SettingIds, EOLS, ExportType } from "./enums";

export interface NewFileSettings {
	typescript: boolean;
	includeFileExtension: boolean;
	includeStyle: boolean;
	includeTranslation: boolean;
	includeTest: boolean;
	exportType: ExportType;
	rootDirectory: string;
	endOfLineSequence: EOLS;
}

export default class FileController {
	private settings: NewFileSettings;

	private currentUri?: vscode.Uri;
	private templates: Templates;

	constructor(currentUri?: vscode.Uri) {
		this.currentUri = currentUri ?? this.getUriOfCurrentFile();
		const config = vscode.workspace.getConfiguration(
			"rmg",
			this.currentUri
		);

		this.settings = {
			typescript: config.get("typescript", false),
			includeFileExtension: config.get("includeFileExtension", false),
			includeStyle: config.get("includeStyle", false),
			includeTranslation: config.get("includeTranslation", false),
			includeTest: config.get("includeTest", false),
			exportType: config.get("exportType", ExportType.all),
			rootDirectory: config.get("rootDirectory", ""),
			endOfLineSequence: config.get("endOfLineSequence", EOLS.lf),
		};

		this.templates = new Templates(this.settings.endOfLineSequence);
		return this;
	}

	public async add(targetDir?: string) {
		if (!targetDir) {
			targetDir = await this.getDir();
		}
		const root = await this.getRoot(targetDir);
		const { name, settings } = await this.getUserSettings();

		const componentName = this.normalizeComponentName(name);
		const componentFilename = this.templates.componentName({
			componentName,
			includeFileExtension: true,
		});
		const componentPath = path.join(root, componentFilename);

		const barrelFilename = this.templates.barrelName();
		const barrelPath = path.join(root, barrelFilename);
		const isBarrel = await fs.stat(barrelPath);
		if (!isBarrel.isFile()) {
			throw new Error("Unable to find barrel.");
		}

		let exportType = this.settings.exportType;
		if (this.settings.exportType === "default") {
			exportType = ExportType.named;
		}
		const barrelTemplate = await this.generateBarrelTemplate(
			componentName,
			{
				exportType,
				includeFileExtension: settings.includeFileExtension,
			}
		);

		await fs.writeFile(barrelPath, barrelTemplate, { flag: "a+" });

		const componentTemplate = await this.generateComponentTemplate(
			componentName,
			{
				includeTranslation: settings.includeTranslation,
				includeStyle: settings.includeStyle,
				includeFileExtension: settings.includeFileExtension,
				includeTest: settings.includeTest,
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

		const dirName = this.normalizeDirName(name);
		const dirPath = path.join(root, dirName);

		const componentName = this.normalizeComponentName(name);
		const componentFilename = this.templates.componentName({
			componentName,
			includeFileExtension: true,
		});
		const componentPath = path.join(dirPath, componentFilename);
		const componentTemplate = await this.generateComponentTemplate(
			componentName,
			{
				includeStyle: settings.includeStyle,
				includeTranslation: settings.includeTranslation,
				includeFileExtension: settings.includeFileExtension,
				includeTest: settings.includeTest,
				exportType: this.settings.exportType,
			}
		);

		const barrelFile = this.templates.barrelName();
		const barrelPath = path.join(dirPath, barrelFile);
		const barrelTemplate = await this.generateBarrelTemplate(
			componentName,
			{
				exportType: this.settings.exportType,
				includeFileExtension: settings.includeFileExtension,
			}
		);

		await fs.mkdir(dirPath);
		await fs.writeFile(barrelPath, barrelTemplate);

		if (settings.includeStyle) {
			const styleName = this.templates.styleName({
				componentName,
				includeFileExtension: true,
			});
			const stylePath = path.join(dirPath, styleName);
			const styleTemplate = this.generateStyleTemplate();
			await fs.writeFile(stylePath, styleTemplate);
		}
		if (settings.includeTranslation) {
			const translationName = this.templates.translationName({
				componentName,
				includeFileExtension: true,
			});
			const translationPath = path.join(dirPath, translationName);
			const translationTemplate = this.generateTranslationTemplate();
			await fs.writeFile(translationPath, translationTemplate);
		}
		if (settings.includeTest) {
			const testName = this.templates.testName({
				componentName,
				includeFileExtension: true,
			});
			const testPath = path.join(dirPath, testName);
			const testTemplate = this.generateTestTemplate();
			await fs.writeFile(testPath, testTemplate);
		}

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
			"Include tests": {
				quickPick: {
					alwaysShow: true,
					label: "Include tests",
					description:
						"Create a test file and import your component.",
					picked: this.settings.includeTest,
				},
				id: SettingIds.includeTest,
			},
			"Include file extensions": {
				quickPick: {
					alwaysShow: true,
					label: "Include file extensions",
					description:
						"Add the files extension to your barrel files export.",
					picked: this.settings.includeFileExtension,
				},
				id: SettingIds.includeFileExtension,
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
			[SettingIds.includeFileExtension]: selectedIds.includes(
				SettingIds.includeFileExtension
			),
			[SettingIds.includeStyle]: selectedIds.includes(
				SettingIds.includeStyle
			),
			[SettingIds.includeTranslation]: selectedIds.includes(
				SettingIds.includeTranslation
			),
			[SettingIds.includeTest]: selectedIds.includes(
				SettingIds.includeTest
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

	private generateStyleTemplate() {
		return this.templates.style();
	}

	private generateTranslationTemplate() {
		return this.templates.translation();
	}

	private generateTestTemplate() {
		return this.templates.test();
	}

	private async generateComponentTemplate(
		componentName: string,
		{
			exportType,
			includeStyle,
			includeTranslation,
			includeFileExtension,
			includeTest,
		}: {
			exportType: NewFileSettings["exportType"];
			includeStyle: boolean;
			includeTranslation: boolean;
			includeFileExtension: boolean;
			includeTest: boolean;
		}
	) {
		const head = this.templates.componentImports({
			componentName,
			includeFileExtension,
			includeStyle,
			includeTranslation,
		});

		const componentOptions = {
			componentName,
			includeFileExtension,
			includeStyle,
			includeTest,
		};
		let body = "";
		switch (exportType) {
			case ExportType.all:
				body = this.templates.componentAll(componentOptions);
				break;
			case ExportType.named:
				body = this.templates.componentNamed(componentOptions);
				break;
			case ExportType.default:
			default:
				body = this.templates.componentAll(componentOptions);
				break;
		}

		return head + body;
	}
	private async generateBarrelTemplate(
		componentName: string,
		{
			exportType,
			includeFileExtension,
		}: {
			exportType: NewFileSettings["exportType"];
			includeFileExtension: boolean;
		}
	) {
		const options = {
			componentName,
			includeFileExtension,
		};
		let result = "";
		switch (exportType) {
			case ExportType.all:
				result = this.templates.barrelAll(options);
				break;
			case ExportType.named:
				result = this.templates.barrelNamed(options);
				break;
			case ExportType.default:
			default:
				result = this.templates.barrelDefault(options);
				break;
		}
		return result;
	}

	private getUriOfCurrentFile() {
		const editor = vscode.window.activeTextEditor;
		return editor ? editor.document.uri : undefined;
	}

	private tidyDir(dir: string) {
		if (process.platform !== "win32") {
			return dir;
		}
		/**
		 * this is for WSL
		 * for some reason it adds / to the end of the path
		 */
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
