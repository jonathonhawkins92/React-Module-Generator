import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";

import * as templates from "./template";
import { SettingIds, EOLS, ExportMethod, ImportMethod } from "./enums";

export interface CommandSettings {
	template: templates.Settings;
}

export default class Command {
	private settings: CommandSettings;
	private currentUri?: vscode.Uri;

	constructor(currentUri?: vscode.Uri) {
		this.currentUri = currentUri ?? this.getUriOfCurrentFile();
		const config = vscode.workspace.getConfiguration(
			"rmg",
			this.currentUri
		);

		this.settings = {
			template: {
				endOfLineSequence: config.get("endOfLineSequence", EOLS.lf),
				exportMethod: config.get("exportMethod", ExportMethod.all),
				importMethod: config.get("importMethod", ImportMethod.named),
				includeFileExtension: config.get("includeFileExtension", false),

				componentName: config.get("componentName"),
				componentAlias: config.get("componentAlias"),
				componentExtension: config.get("componentExtension", ".tsx"),

				includeBarrel: config.get("includeBarrel", true),
				barrelName: config.get("barrelName"),
				barrelAlias: config.get("barrelAlias"),
				barrelExtension: config.get("barrelExtension", ".ts"),

				includeStyle: config.get("includeStyle", true),
				styleName: config.get("styleName"),
				styleAlias: config.get("styleAlias"),
				styleExtension: config.get("styleExtension", "module.css"),

				includeTranslation: config.get("includeTranslation", true),
				translationName: config.get("translationName"),
				translationAlias: config.get("translationAlias"),
				translationExtension: config.get(
					"translationExtension",
					"intl.ts"
				),

				includeTest: config.get("includeTest", true),
				testName: config.get("testName"),
				testAlias: config.get("testAlias"),
				testExtension: config.get("testExtension", "test.ts"),
			},
		};

		return this;
	}

	public async add(targetDir?: string) {
		if (!targetDir) {
			targetDir = await this.getDir();
		}
		const directory = await this.getRoot(targetDir);
		const { name, settings } = await this.getUserSettings();
		const moduleName = this.normalizeComponentName(name);

		const style = new templates.Style(
			directory,
			moduleName,
			[],
			this.settings.template
		);
		const translation = new templates.Translation(
			directory,
			moduleName,
			[],
			this.settings.template
		);
		const component = new templates.Component(
			directory,
			moduleName,
			[style, translation],
			this.settings.template
		);
		const test = new templates.Test(
			directory,
			moduleName,
			[component],
			this.settings.template
		);
		const barrel = new templates.Barrel(
			directory,
			moduleName,
			[component],
			this.settings.template
		);

		const isBarrel = await fs.stat(barrel.path);
		if (!isBarrel.isFile()) {
			throw new Error("Unable to find barrel.");
		}

		if (settings.includeStyle) {
			await fs.writeFile(style.path, style.content);
		}

		if (settings.includeTranslation) {
			await fs.writeFile(translation.path, translation.content);
		}

		await fs.writeFile(component.path, component.content);

		if (settings.includeTest) {
			await fs.writeFile(test.path, test.content);
		}

		await fs.writeFile(barrel.path, barrel.content, { flag: "a+" });

		const doc = await vscode.workspace.openTextDocument(component.path);
		vscode.window.showTextDocument(doc);
	}

	public async create(targetDir?: string) {
		if (!targetDir) {
			targetDir = await this.getDir();
		}
		const root = await this.getRoot(targetDir);
		const { name, settings } = await this.getUserSettings();

		const dirName = this.normalizeDirName(name);
		const directory = path.join(root, dirName);
		const moduleName = this.normalizeComponentName(name);

		const style = new templates.Style(
			directory,
			moduleName,
			[],
			this.settings.template
		);
		const translation = new templates.Translation(
			directory,
			moduleName,
			[],
			this.settings.template
		);
		const component = new templates.Component(
			directory,
			moduleName,
			[style, translation],
			this.settings.template
		);
		const test = new templates.Test(
			directory,
			moduleName,
			[component],
			this.settings.template
		);
		const barrel = new templates.Barrel(
			directory,
			moduleName,
			[component],
			this.settings.template
		);

		await fs.mkdir(directory);

		if (settings.includeStyle) {
			await fs.writeFile(style.path, style.content);
		}

		if (settings.includeTranslation) {
			await fs.writeFile(translation.path, translation.content);
		}

		await fs.writeFile(component.path, component.content);

		if (settings.includeTest) {
			await fs.writeFile(test.path, test.content);
		}

		await fs.writeFile(barrel.path, barrel.content);

		const doc = await vscode.workspace.openTextDocument(component.path);
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
					picked: this.settings.template.includeStyle,
				},
				id: SettingIds.includeStyle,
			},
			"Include translations": {
				quickPick: {
					alwaysShow: true,
					label: "Include translations",
					description:
						"Create a translation file and import it in your component.",
					picked: this.settings.template.includeTranslation,
				},
				id: SettingIds.includeTranslation,
			},
			"Include tests": {
				quickPick: {
					alwaysShow: true,
					label: "Include tests",
					description:
						"Create a test file and import your component.",
					picked: this.settings.template.includeTest,
				},
				id: SettingIds.includeTest,
			},
			"Include file extensions": {
				quickPick: {
					alwaysShow: true,
					label: "Include file extensions",
					description:
						"Add the files extension to your barrel files export.",
					picked: this.settings.template.includeFileExtension,
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
		return undefined;
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
