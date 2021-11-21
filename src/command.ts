import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";

import * as templates from "./template";
import { SettingIds, EOLS, ExportType } from "./enums";
import Validator from "./validator";

export interface CommandSettings {
	template: templates.Settings;
}

function validationError(name: string) {
	vscode.window.showErrorMessage(`Template ${name}, is not valid.`);
}

interface Node {
	template: unknown;
	name: string;
	children: string[];
}

interface Relationships {
	entrypoints: string[];
	nodes: Record<string, Node>;
}
const relationships: Relationships = {
	entrypoints: ["barrel", "test", "example"],
	nodes: {
		barrel: {
			template: templates.Barrel,
			name: "barrel",
			children: ["component"],
		},
		test: {
			template: templates.Test,
			name: "test",
			children: ["component"],
		},
		component: {
			template: templates.Component,
			name: "component",
			children: ["style", "translation"],
		},
		style: {
			template: templates.Style,
			name: "style",
			children: [],
		},
		translation: {
			template: templates.Translation,
			name: "translation",
			children: [],
		},
		example: {
			template: templates.Translation,
			name: "example",
			children: ["translation"],
		},
	},
};

const MAX_DEPTH = 99;
function relationshipPipeline(relationships: Relationships) {
	const lookup: Record<string, number> = {};

	function depthFinder(node: Node, depth = 1) {
		// TODO: replace with tarjan's algorithm
		if (depth > MAX_DEPTH) {
			console.error(
				`Max depth of ${MAX_DEPTH} reached, there is probably a circular reference in your files relationships.`
			);
			return;
		}

		if (lookup[node.name]) {
			const refDepth = lookup[node.name] ?? 0;
			if (refDepth > depth) {
				// Already processed
				return;
			}
		}

		lookup[node.name] = depth;

		if (node.children.length > 0) {
			for (const child of node.children) {
				const nextNode = relationships.nodes[child];
				depthFinder(nextNode, depth + 1);
			}
		}
	}

	for (const entry of relationships.entrypoints) {
		const node = relationships.nodes[entry];
		lookup[node.name] = 0;
		if (node.children.length > 0) {
			for (const child of node.children) {
				const nextNode = relationships.nodes[child];
				depthFinder(nextNode);
			}
		}
	}

	const result: string[][] = [];
	for (const [name, index] of Object.entries(lookup)) {
		if (!result[index]) {
			result[index] = [];
		}
		result[index].push(name);
	}

	for (let depth = result.length - 1; depth >= 0; depth--) {
		const entries = result[depth];
		for (const entry of entries) {
			console.log(depth, entry);
		}
	}
}

relationshipPipeline(relationships);

export default class Command {
	private settings: CommandSettings;
	private currentUri?: vscode.Uri;

	constructor(currentUri?: vscode.Uri) {
		this.currentUri = currentUri ?? this.getUriOfCurrentFile();
		const config = vscode.workspace.getConfiguration(
			"rmg",
			this.currentUri
		);

		const typeOfEols = config.get("global.endOfLineSequence", "lf");
		this.settings = {
			template: {
				endOfLineSequence: EOLS[typeOfEols],

				componentImports: config.get("component.imports", []),
				componentExportType: config.get(
					"component.export.type",
					ExportType.all
				),
				componentExportExtension: config.get(
					"component.export.extension",
					false
				),
				componentAlias: config.get("component.export.alias"),
				componentName: config.get("component.file.name"),
				componentExtension: config.get(
					"component.file.extension",
					".tsx"
				),

				barrel: config.get("barrel.include", true),
				barrelImports: config.get("barrel.imports", []),
				barrelExportType: config.get(
					"barrel.export.type",
					ExportType.all
				),
				barrelExportExtension: config.get(
					"barrel.export.extension",
					false
				),
				barrelAlias: config.get("barrel.export.alias"),
				barrelName: config.get("barrel.file.name"),
				barrelExtension: config.get("barrel.file.extension", ".ts"),

				style: config.get("style.include", true),
				styleImports: config.get("style.imports", []),
				styleExportType: config.get(
					"style.export.type",
					ExportType.all
				),
				styleExportExtension: config.get(
					"style.export.extension",
					false
				),
				styleAlias: config.get("style.export.alias"),
				styleName: config.get("style.file.name"),
				styleExtension: config.get(
					"style.file.extension",
					"module.css"
				),

				translation: config.get("translation.include", true),
				translationImports: config.get("translation.imports", []),
				translationExportType: config.get(
					"translation.export.type",
					ExportType.all
				),
				translationExportExtension: config.get(
					"translation.export.extension",
					false
				),
				translationAlias: config.get("translation.export.alias"),
				translationName: config.get("translation.file.name"),
				translationExtension: config.get(
					"translation.file.extension",
					"intl.ts"
				),

				test: config.get("test.include", true),
				testImports: config.get("test.imports", []),
				testExportType: config.get("test.export.type", ExportType.all),
				testExportExtension: config.get("test.export.extension", false),
				testAlias: config.get("test.export.alias"),
				testName: config.get("test.file.name"),
				testExtension: config.get("test.file.extension", "test.ts"),
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

		// Create module
		const componentDepends = [];
		let translation;
		if (settings.translation) {
			translation = new templates.Translation(
				directory,
				moduleName,
				[],
				this.settings.template
			);
			if (!Validator.assertTemplate(translation)) {
				return validationError("translation");
			}
			componentDepends.push(translation);
		}

		let style;
		if (settings.style) {
			style = new templates.Style(
				directory,
				moduleName,
				[],
				this.settings.template
			);
			if (!Validator.assertTemplate(style)) {
				return validationError("style");
			}
			componentDepends.push(style);
		}

		const component = new templates.Component(
			directory,
			moduleName,
			componentDepends,
			this.settings.template
		);
		if (!Validator.assertTemplate(component)) {
			return validationError("component");
		}

		let test;
		if (settings.test) {
			test = new templates.Test(
				directory,
				moduleName,
				[component],
				this.settings.template
			);
			if (!Validator.assertTemplate(test)) {
				return validationError("test");
			}
		}

		let barrel;
		if (settings.barrel) {
			barrel = new templates.Barrel(
				directory,
				moduleName,
				[component],
				this.settings.template
			);
			if (!Validator.assertTemplate(barrel)) {
				return validationError("barrel");
			}
		}

		// Write module
		if (settings.translation && translation) {
			if (translation.directories.length > 0) {
				await this.createDir(directory, translation.directories);
			}
			await fs.writeFile(translation.path, translation.content);
		}

		if (settings.style && style) {
			if (style.directories.length > 0) {
				await this.createDir(directory, style.directories);
			}
			await fs.writeFile(style.path, style.content);
		}

		await fs.writeFile(component.path, component.content);
		if (component.directories.length > 0) {
			await this.createDir(directory, component.directories);
		}

		if (settings.test && test) {
			if (test.directories.length > 0) {
				await this.createDir(directory, test.directories);
			}
			await fs.writeFile(test.path, test.content);
		}

		if (settings.barrel && barrel) {
			const isBarrel = await fs.stat(barrel.path);
			if (!isBarrel.isFile()) {
				throw new Error("Unable to find barrel.");
			}
			await fs.writeFile(barrel.path, barrel.content, { flag: "a+" });
		}

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

		// Create module
		const componentDepends = [];
		let translation;
		if (settings.translation) {
			translation = new templates.Translation(
				directory,
				moduleName,
				[],
				this.settings.template
			);
			if (!Validator.assertTemplate(translation)) {
				return validationError("translation");
			}
			componentDepends.push(translation);
		}

		let style;
		if (settings.style) {
			style = new templates.Style(
				directory,
				moduleName,
				[],
				this.settings.template
			);
			if (!Validator.assertTemplate(style)) {
				return validationError("style");
			}
			componentDepends.push(style);
		}

		const component = new templates.Component(
			directory,
			moduleName,
			componentDepends,
			this.settings.template
		);
		if (!Validator.assertTemplate(component)) {
			return validationError("component");
		}

		let test;
		if (settings.test) {
			test = new templates.Test(
				directory,
				moduleName,
				[component],
				this.settings.template
			);
			if (!Validator.assertTemplate(test)) {
				return validationError("test");
			}
		}

		let barrel;
		if (settings.barrel) {
			barrel = new templates.Barrel(
				directory,
				moduleName,
				[component],
				this.settings.template
			);
			if (!Validator.assertTemplate(barrel)) {
				return validationError("barrel");
			}
		}

		// Write module
		await fs.mkdir(directory);

		if (settings.translation && translation) {
			if (translation.directories.length > 0) {
				await this.createDir(directory, translation.directories);
			}
			await fs.writeFile(translation.path, translation.content);
		}

		if (settings.style && style) {
			if (style.directories.length > 0) {
				await this.createDir(directory, style.directories);
			}
			await fs.writeFile(style.path, style.content);
		}

		await fs.writeFile(component.path, component.content);
		if (component.directories.length > 0) {
			await this.createDir(directory, component.directories);
		}

		if (settings.test && test) {
			console.log({
				name: test.name,
				directories: test.directories,
				directory,
				path: test.path,
				content: test.content,
			});
			if (test.directories.length > 0) {
				await this.createDir(directory, test.directories);
			}
			await fs.writeFile(test.path, test.content);
		}

		if (settings.barrel && barrel) {
			if (barrel.directories.length > 0) {
				await this.createDir(directory, barrel.directories);
			}
			await fs.writeFile(barrel.path, barrel.content);
		}

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
			"Include styles file": {
				quickPick: {
					alwaysShow: true,
					label: "Include styles file",
					description:
						"Create a style file and import it in your component.",
					picked: this.settings.template.style,
				},
				id: SettingIds.style,
			},
			"Include translations file": {
				quickPick: {
					alwaysShow: true,
					label: "Include translations file",
					description:
						"Create a translation file and import it in your component.",
					picked: this.settings.template.translation,
				},
				id: SettingIds.translation,
			},
			"Include tests file": {
				quickPick: {
					alwaysShow: true,
					label: "Include tests file",
					description:
						"Create a test file and import your component.",
					picked: this.settings.template.test,
				},
				id: SettingIds.test,
			},
			"Include barrel file": {
				quickPick: {
					alwaysShow: true,
					label: "Include barrel file",
					description:
						"Add a file to expose your modules public resources.",
					picked: this.settings.template.barrel,
				},
				id: SettingIds.barrel,
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
			[SettingIds.style]: selectedIds.includes(SettingIds.style),
			[SettingIds.translation]: selectedIds.includes(
				SettingIds.translation
			),
			[SettingIds.test]: selectedIds.includes(SettingIds.test),
			[SettingIds.barrel]: selectedIds.includes(SettingIds.barrel),
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

	private async createDir(parentDir: string, dirs: string[]) {
		let prevDir = parentDir;
		for (const dir of dirs) {
			const nextDir = path.join(prevDir, dir);
			try {
				const prevDirStats = await fs.stat(prevDir);
				if (prevDirStats.isDirectory()) {
					await fs.mkdir(nextDir);
				}
			} catch (e) {
				if (e instanceof Error && e.message.includes("ENOENT")) {
					console.log("[command.createDir]", e);
				}
			}
			prevDir = nextDir;
		}
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
