import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";

import { Barrel, Test, Component, Style, Translation } from "./template";
import type { Config, FileBase } from "./template";
import { EOLS, ExportType } from "./enums";
import Validator from "./validator";

function validationError(name: string) {
	vscode.window.showErrorMessage(`Template ${name}, is not valid.`);
}

interface Node {
	instance: FileBase | null;
	template: typeof FileBase;
	name: string;
	children: string[];
	open?: boolean;
}

interface Relationships {
	entrypoints: string[];
	nodes: Record<string, Node>;
}

const relationships: Relationships = {
	entrypoints: ["barrel", "test"],
	nodes: {
		barrel: {
			instance: null,
			template: Barrel,
			name: "barrel",
			children: ["component"],
		},
		test: {
			instance: null,
			template: Test,
			name: "test",
			children: ["component"],
		},
		component: {
			instance: null,
			template: Component,
			name: "component",
			children: ["style", "translation"],
			open: true,
		},
		style: {
			instance: null,
			template: Style,
			name: "style",
			children: [],
		},
		translation: {
			instance: null,
			template: Translation,
			name: "translation",
			children: [],
		},
	},
};

export type CommandSettings = {
	eol: EOLS;
	template: Record<string, Config>;
};
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
			eol: EOLS[typeOfEols],
			template: {
				component: {
					include: true,
					name: config.get("component.file.name"),
					alias: config.get("component.export.alias"),
					imports: config.get("component.imports", []),
					extension: config.get("component.file.extension", ".tsx"),
					exportType: config.get(
						"component.export.type",
						ExportType.all
					),
					exportExtension: config.get(
						"component.export.extension",
						false
					),
				},
				barrel: {
					include: config.get("barrel.include", true),
					imports: config.get("barrel.imports", []),
					exportType: config.get(
						"barrel.export.type",
						ExportType.all
					),
					exportExtension: config.get(
						"barrel.export.extension",
						false
					),
					alias: config.get("barrel.export.alias"),
					name: config.get("barrel.file.name"),
					extension: config.get("barrel.file.extension", ".ts"),
				},
				style: {
					include: config.get("style.include", true),
					imports: config.get("style.imports", []),
					exportType: config.get("style.export.type", ExportType.all),
					exportExtension: config.get(
						"style.export.extension",
						false
					),
					alias: config.get("style.export.alias"),
					name: config.get("style.file.name"),
					extension: config.get("style.file.extension", "module.css"),
				},
				translation: {
					include: config.get("translation.include", true),
					imports: config.get("translation.imports", []),
					exportType: config.get(
						"translation.export.type",
						ExportType.all
					),
					exportExtension: config.get(
						"translation.export.extension",
						false
					),
					alias: config.get("translation.export.alias"),
					name: config.get("translation.file.name"),
					extension: config.get(
						"translation.file.extension",
						"intl.ts"
					),
				},
				test: {
					include: config.get("test.include", true),
					imports: config.get("test.imports", []),
					exportType: config.get("test.export.type", ExportType.all),
					exportExtension: config.get("test.export.extension", false),
					alias: config.get("test.export.alias"),
					name: config.get("test.file.name"),
					extension: config.get("test.file.extension", "test.ts"),
				},
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
		const depths = this.generateDepthMap(relationships);
		this.generateTemplateInstances(directory, moduleName, depths, settings);
		let openFilePath: null | string = null;

		const entrypoints: Record<string, true> = {};
		for (const entrypoint of relationships.entrypoints) {
			entrypoints[entrypoint] = true;
		}

		// create files
		for (const names of depths) {
			for (const name of names) {
				if (!settings[name] || entrypoints[name]) {
					continue;
				}
				const node = relationships.nodes[name];

				if (!Validator.assertTemplate(node.instance)) {
					return validationError(node.name);
				}

				if (node.instance === null) {
					return validationError(node.name);
				}

				if (node.instance.directories.length > 0) {
					await this.createDir(directory, node.instance.directories);
				}
				await fs.writeFile(node.instance.path, node.instance.content);

				if (node.open) {
					openFilePath = node.instance.path;
				}
			}
		}
		for (const name of relationships.entrypoints) {
			if (!settings[name]) {
				continue;
			}
			const node = relationships.nodes[name];

			if (!Validator.assertTemplate(node.instance)) {
				return validationError(node.name);
			}

			if (node.instance === null) {
				return validationError(node.name);
			}

			if (node.instance.directories.length > 0) {
				await this.createDir(directory, node.instance.directories);
			}

			try {
				const fileStats = await fs.stat(node.instance.path);
				if (!fileStats.isFile()) {
					throw new Error("Not a file");
				}
				await fs.writeFile(node.instance.path, node.instance.content, {
					flag: "a+",
				});
			} catch (_) {
				await fs.writeFile(node.instance.path, node.instance.content);
			}

			if (node.open) {
				openFilePath = node.instance.path;
			}
		}

		if (openFilePath === null) {
			return;
		}
		const doc = await vscode.workspace.openTextDocument(openFilePath);
		vscode.window.showTextDocument(doc);
	}

	public async create(targetDir?: string) {
		if (!targetDir) {
			targetDir = await this.getDir();
		}
		const root = await this.getRoot(targetDir);
		const { name: baseName, settings } = await this.getUserSettings();

		const dirName = this.normalizeDirName(baseName);
		const directory = path.join(root, dirName);
		const moduleName = this.normalizeComponentName(baseName);

		const depths = this.generateDepthMap(relationships);
		this.generateTemplateInstances(directory, moduleName, depths, settings);
		let openFilePath: null | string = null;

		await fs.mkdir(directory);

		// create files
		for (const names of depths) {
			for (const name of names) {
				if (!settings[name]) {
					continue;
				}
				const node = relationships.nodes[name];

				if (!Validator.assertTemplate(node.instance)) {
					return validationError(node.name);
				}

				if (node.instance === null) {
					return validationError(node.name);
				}

				if (node.instance.directories.length > 0) {
					await this.createDir(directory, node.instance.directories);
				}
				await fs.writeFile(node.instance.path, node.instance.content);

				if (node.open) {
					openFilePath = node.instance.path;
				}
			}
		}

		if (openFilePath === null) {
			return;
		}
		const doc = await vscode.workspace.openTextDocument(openFilePath);
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

	private generateDepthMap(relationships: Relationships) {
		const MAX_DEPTH = 99;
		const lookup: Record<string, number> = {};

		function depthFinder(children: string[], depth = 1) {
			// TODO: replace with tarjan's algorithm
			if (depth > MAX_DEPTH) {
				console.error(
					`Max depth of ${MAX_DEPTH} reached, there is probably a circular reference in your files relationships.`
				);
				return;
			}

			if (children.length <= 0) {
				return;
			}

			for (const child of children) {
				const node = relationships.nodes[child];

				if (lookup[node.name]) {
					const refDepth = lookup[node.name] ?? 0;
					if (refDepth > depth) {
						// Already processed
						return;
					}
				}

				lookup[node.name] = depth;

				const nextNode = relationships.nodes[child];
				depthFinder(nextNode.children, depth + 1);
			}
		}

		for (const entry of relationships.entrypoints) {
			const node = relationships.nodes[entry];
			lookup[node.name] = 0;
			depthFinder(node.children);
		}

		const result: string[][] = [];
		for (const [name, index] of Object.entries(lookup)) {
			if (!result[index]) {
				result[index] = [];
			}
			result[index].push(name);
		}

		return result;
	}

	private generateTemplateInstances(
		directory: string,
		moduleName: string,
		depths: string[][],
		settings: Record<string, boolean>
	) {
		// map node relationships
		for (let depth = depths.length - 1; depth >= 0; depth--) {
			const names = depths[depth];
			for (const name of names) {
				if (!settings[name]) {
					continue;
				}
				const node = relationships.nodes[name];
				const children = [];
				for (const childName of node.children) {
					const child = relationships.nodes[childName].instance;
					if (child === null) {
						continue;
					}
					children.push(child);
				}

				const template = new node.template(
					directory,
					moduleName,
					children,
					this.settings.eol,
					this.settings.template[node.name]
				);
				if (!Validator.assertTemplate<typeof template>(template)) {
					return validationError(template.name);
				}
				relationships.nodes[name].instance = template;
			}
		}
	}

	private async getUserSettings() {
		const options: Record<
			string,
			{
				quickPick: vscode.QuickPickItem;
				id: string;
			}
		> = {};
		for (const key of Object.keys(relationships.nodes)) {
			const label = `Include ${key} file`;
			options[label] = {
				quickPick: {
					alwaysShow: true,
					label,
					picked: this.settings.template[key].include,
				},
				id: key,
			};
		}

		const optionsQuickPicks = Object.values(options).map(
			(value) => value.quickPick
		);

		const input = await vscode.window.createQuickPick();
		input.title = "Settings";
		input.placeholder = "What's the name of your new module?";
		input.matchOnDescription = false;
		input.matchOnDetail = false;
		input.items = optionsQuickPicks;
		input.canSelectMany = true;
		input.selectedItems = optionsQuickPicks.filter((value) => value.picked);

		let name = "";
		let settings: Record<string, boolean> = {};
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
				settings = {};
				for (const item of selection) {
					const id = item.label;
					const setting = options[id];
					settings[setting.id] = true;
				}
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
