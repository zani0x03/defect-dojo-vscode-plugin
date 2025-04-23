import * as vscode from 'vscode';
import { ApiResponse } from '../interfaces/apiResponse';
import { Finding } from '../interfaces/finding';
import { FindingTreeItem } from '../classes/findingTreeItem';

export class FindingsView implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private apiResponseFindings: ApiResponse<Finding> = { count: 0, next: null, previous: null, results: [] };

    constructor(private context: vscode.ExtensionContext) {
        this.refresh();
    }

    refresh(): void {
        this.fetchFindings();
    }

    private async fetchFindings(): Promise<void> {
        const configs = vscode.workspace.getConfiguration("defect-dojo-vscode-plugin");
        const token = await this.context.secrets.get('defectDojoToken');

        if (!configs.url || !token) {
            vscode.window.showErrorMessage('Configurações inválidas.');
            return;
        }

        try {
            const response = await fetch(`${configs.url}/api/v2/findings?active=true&o=severity&product_name=${configs.productName}`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (!response.ok) {
                vscode.window.showErrorMessage('Erro ao obter findings.');
                return;
            }

            this.apiResponseFindings = await response.json() as ApiResponse<Finding>;
            this._onDidChangeTreeData.fire();
        } catch (error) {
            vscode.window.showErrorMessage(`Erro: ${error}`);
        }
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!element) {
            return this.apiResponseFindings.results
              .filter(finding => finding.file_path)
              .map(finding => {
                const text = `${finding.title}(${finding.severity})`;
                // const item = new vscode.TreeItem(text);
                const item = new FindingTreeItem(text, finding, vscode.TreeItemCollapsibleState.None);
                item.command = {
                    command: 'defect-dojo-vscode-plugin.openFile',
                    title: 'Open Finding',
                    arguments: [finding.file_path, finding.line, finding.title, finding.description]
                };
                item.contextValue="finding-item";
                return item;
            });
        }
        return [];
    }
}