import * as vscode from 'vscode';
import { Product } from '../interfaces/product';
import { ApiResponse } from '../interfaces/apiResponse';

export class ProductView implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!element) {
            // Obter configurações

            const configs = vscode.workspace.getConfiguration("defect-dojo-vscode-plugin");
            const token = await this.context.secrets.get('defectDojoToken');

            if (!configs.url || !configs.productName || !token) {
                vscode.window.showErrorMessage('Configurações inválidas.');
                return [];
            }

            try {
                // Realizar requisição à API
                const response = await fetch(`${configs.url}/api/v2/products?name_exact=${configs.productName}`, {
                    headers: {
                        'Authorization': `Token ${token}`
                    }
                });

                if (!response.ok) {
                    vscode.window.showErrorMessage('Erro ao obter dados do produto.');
                    return [];
                }

                const product = await response.json() as ApiResponse<Product>;

                // Criar TreeItems
                const nameItem = new vscode.TreeItem(`Nome: ${product.results[0].name}`);
                nameItem.description = 'Nome do produto';

                const descriptionItem = new vscode.TreeItem(`Descrição: ${product.results[0].description}`);
                descriptionItem.description = 'Descrição do produto';

                return [nameItem, descriptionItem];
            } catch (error) {
                vscode.window.showErrorMessage(`Erro: ${error}`);
                return [];
            }
        }

        return [];
    }
}