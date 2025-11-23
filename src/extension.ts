import * as vscode from "vscode";
import { Logger } from "./utils/logger";
import { Database } from "./storage/database";
import { StatusBarManager } from "./sync/statusBarManger";
import { Tracker } from "./sync/tracker";
import { ApiClient } from "./api/client";
import { GitTracker } from "./utils/gitTracker";

let db: Database;
let tracker: Tracker;
let statusBarManager: StatusBarManager;
let apiClient: ApiClient;
let gitTracker: GitTracker;

export async function activate(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  logger.info("Miss-Minutes extension is activating...");

  try {
    // Register commands first before any async operations
    // Auth Command
    const setApiKeyCommand = vscode.commands.registerCommand(
      "miss-minutes.setApiKey",
      async () => {
        const token = await vscode.window.showInputBox({
          prompt: "Enter your Miss-Minutes API Token",
          password: true,
          ignoreFocusOut: true,
          placeHolder: "Paste your API token here",
        });

        if (token) {
          await context.secrets.store("miss_minutes_api_token", token);
          if (apiClient) {
            apiClient.updateToken(token);
          }
          vscode.window.showInformationMessage(
            "Miss-Minutes: API Token saved successfully!"
          );
          logger.info("API Token saved");
          if (statusBarManager) {
            statusBarManager.updateStatus("Miss-Minutes: Active");
          }
        }
      }
    );
    context.subscriptions.push(setApiKeyCommand);

    // Hello World Command
    const helloWorldCommand = vscode.commands.registerCommand(
      "miss-minutes.helloWorld",
      () => {
        vscode.window.showInformationMessage("Hello World from Miss-Minutes!");
        logger.info("Hello World command executed");
      }
    );
    context.subscriptions.push(helloWorldCommand);

    logger.info("Commands registered successfully");

    // Initialize Database
    // Use globalStorageUri for persistent storage across sessions
    const storagePath = context.globalStorageUri.fsPath;
    db = new Database(storagePath);
    await db.init();

    // Initialize API Client
    apiClient = new ApiClient();

    // Initialize Status Bar
    statusBarManager = new StatusBarManager();

    // Register statusBarManager as a disposable
    context.subscriptions.push(
      new vscode.Disposable(() => statusBarManager.dispose())
    );

    // Initialize Git Tracker
    gitTracker = new GitTracker(db);
    gitTracker.watchGitChanges(context);

    // Initialize Tracker
    tracker = new Tracker(statusBarManager, db, apiClient, gitTracker);
    tracker.startTracking();

    // Check for existing token
    const token = await context.secrets.get("miss_minutes_api_token");
    if (!token) {
      statusBarManager.updateStatus(
        "Miss-Minutes: No Token",
        "Click to set API Token"
      );
      const selection = await vscode.window.showWarningMessage(
        "Miss-Minutes: API Token is missing. Please provide it to enable syncing.",
        "Enter API Token"
      );
      if (selection === "Enter API Token") {
        vscode.commands.executeCommand("miss-minutes.setApiKey");
      }
    } else {
      logger.info("API Token found.");
      apiClient.updateToken(token);
      statusBarManager.updateStatus("Miss-Minutes: Active");
    }

    logger.info("Miss-Minutes initialized successfully");
  } catch (err) {
    logger.error("Error activating Miss-Minutes extension", err as Error);
    vscode.window.showErrorMessage(
      `Miss-Minutes failed to activate: ${(err as Error).message}`
    );
  }
}

export function deactivate() {
  if (db) {
    db.close();
  }
  if (tracker) {
    tracker.stopTracking();
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
