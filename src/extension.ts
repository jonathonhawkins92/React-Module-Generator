import * as vscode from "vscode";

import { EOLS, ExportType } from "./enums";
import { relationships } from "./relationship";
import Command from "./command";
import type { Config } from "./templates/config";

export function activate(context: vscode.ExtensionContext) {
	const create = vscode.commands.registerCommand(
		"rmg.create",
		async (file) => {
			const code = new VSCode();
			try {
				const nodes = Object.keys(relationships.nodes);
				const command = new Command(
					code.eol,
					code.templateConfig,
					code.openFile,
					code.validationError,
					relationships
				);
				if (file?.path) {
					const { name, settings } = await code.getRuntimeSettings(
						nodes
					);
					await command.explorerCreate(file.path, name, settings);
					return;
				}
				const root = await code.getDir();
				if (!root) {
					throw new Error("Unable to find directory");
				}
				const { name, settings } = await code.getRuntimeSettings(nodes);
				await command.create(root, name, settings);
			} catch (err) {
				code.error(err);
			}
		}
	);
	context.subscriptions.push(create);

	const add = vscode.commands.registerCommand("rmg.add", async (file) => {
		const code = new VSCode();
		try {
			const nodes = Object.keys(relationships.nodes);
			const command = new Command(
				code.eol,
				code.templateConfig,
				code.openFile,
				code.validationError,
				relationships
			);
			if (file?.path) {
				const { name, settings } = await code.getRuntimeSettings(nodes);
				await command.explorerAdd(file.path, name, settings);
				return;
			}
			const root = await code.getDir();
			if (!root) {
				throw new Error("Unable to find directory");
			}
			const { name, settings } = await code.getRuntimeSettings(nodes);
			await command.add(root, name, settings);
		} catch (err) {
			code.error(err);
		}
	});
	context.subscriptions.push(add);
}

// this method is called when your extension is deactivated
export function deactivate() {}

class VSCode {
	public templateConfig: Record<string, Config>;
	public eol: EOLS;
	constructor() {
		const config = vscode.workspace.getConfiguration(
			"rmg",
			this.getUriOfCurrentFile()
		);

		const typeOfEols = config.get("global.endOfLineSequence", "lf");
		this.eol = EOLS[typeOfEols];
		this.templateConfig = {
			component: {
				include: true,
				name: config.get("component.file.name"),
				alias: config.get("component.export.alias"),
				imports: config.get("component.imports", []),
				extension: config.get("component.file.extension", ".tsx"),
				exportType: config.get("component.export.type", ExportType.all),
				exportExtension: config.get(
					"component.export.extension",
					false
				),
			},
			barrel: {
				include: config.get("barrel.include", true),
				imports: config.get("barrel.imports", []),
				exportType: config.get("barrel.export.type", ExportType.all),
				exportExtension: config.get("barrel.export.extension", false),
				alias: config.get("barrel.export.alias"),
				name: config.get("barrel.file.name"),
				extension: config.get("barrel.file.extension", ".ts"),
			},
			style: {
				include: config.get("style.include", true),
				imports: config.get("style.imports", []),
				exportType: config.get("style.export.type", ExportType.all),
				exportExtension: config.get("style.export.extension", false),
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
				extension: config.get("translation.file.extension", "intl.ts"),
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
		};

		return this;
	}

	public error(error: unknown) {
		if (error instanceof Error) {
			vscode.window.showErrorMessage(error.message);
		}
	}

	public async openFile(path: string) {
		const doc = await vscode.workspace.openTextDocument(path);
		vscode.window.showTextDocument(doc);
	}

	public validationError(name: string) {
		this.error(new Error(`Template ${name}, is not valid.`));
	}

	public async getRuntimeSettings(nodes: string[] = []) {
		const options: Record<
			string,
			{
				quickPick: vscode.QuickPickItem;
				id: string;
			}
		> = {};
		for (const node of nodes) {
			const label = `Include ${node} file`;
			options[label] = {
				quickPick: {
					alwaysShow: true,
					label,
					picked: this.templateConfig[node].include,
				},
				id: node,
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

	public async getDir() {
		const directories = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
		});
		if (directories && directories.length > 0) {
			return directories[0].fsPath;
		}
		return undefined;
	}

	private getUriOfCurrentFile() {
		const editor = vscode.window.activeTextEditor;
		return editor ? editor.document.uri : undefined;
	}
}
