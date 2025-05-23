// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ProductView } from './views/productView';
import { FindingTreeItem } from './classes/findingTreeItem';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	const secretStorage = context.secrets;

    // Armazenar o token
    const storeToken = async () => {
        const token = await vscode.window.showInputBox({
            prompt: 'Please provide your API token for access to the DefectDojo API. I will keep it confidential.'
        });

        if (token) {
            await secretStorage.store('defectDojoToken', token);
            vscode.window.showInformationMessage('Token stored successfully.');
        }
    };	

	const productView = new ProductView(context);
	vscode.window.createTreeView('defect-dojo-view-product-info', { treeDataProvider: productView });

	context.subscriptions.push(
    vscode.commands.registerCommand('defect-dojo-vscode-plugin.refresh', () => {
      productView.refresh();
    }),    
		vscode.commands.registerCommand('defect-dojo-vscode-plugin.storeToken', storeToken),
    vscode.commands.registerCommand('defect-dojo-vscode-plugin.openFile', async (filePath: string, lineNumber: number, findingTitle: string, findingDescription: string) => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No directory is open in VS Code.');
            return;
        }

        const fullPath = `${workspaceFolders[0].uri.fsPath}/${filePath}`;
        try{
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fullPath));
            await vscode.window.showTextDocument(document);

            const editor = vscode.window.activeTextEditor;
            if(editor){
              const line = document.lineAt(lineNumber - 1);
              const range = new vscode.Range(line.range.start, line.range.end);
              editor.selection = new vscode.Selection(range.start, range.end);
              editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
              vscode.window.setStatusBarMessage(`Vulnerability: ${findingTitle} - ${findingDescription}`, 5000); 
                const decorationType = vscode.window.createTextEditorDecorationType({
                  before: {
                      contentText: ` ℹ️ ${findingDescription} `,
                      color: 'var(--vscode-editor-foreground)',
                      backgroundColor: 'var(--vscode-editor-background)',
                      border: '2px solid var(--vscode-editor-foreground)',
                      fontWeight: 'bold',
                      textDecoration: 'none; !important',
                      margin: '0 5px'
                  },
                  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
              });

              editor.setDecorations(decorationType, [range]);


              setTimeout(() => {
                  editor.setDecorations(decorationType, []);
              }, 5000); 
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error opening file.: ${error}`);
        }
    }),
    vscode.commands.registerCommand('defect-dojo-vscode-plugin.markAsFalsePositive', async (item) => {
      await callAPIFalsePositivo(item);
      productView.refresh();
    })        
	);

  async function callAPIFalsePositivo(item:FindingTreeItem): Promise<void> {
    const configs = vscode.workspace.getConfiguration("defect-dojo-vscode-plugin");
    const token = await context.secrets.get('defectDojoToken');
    const now = new Date();
    const isoDate = now.toISOString();
    const dataToSend = {
      is_mitigated: true,
      mitigated: isoDate,
      false_p:true
    };          
    try {
      const response = await fetch(`${configs.url}/api/v2/findings/${item.finding.id}/close/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(dataToSend)
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        vscode.window.showErrorMessage(`Response Error: ${errorMessage}`);
        return;
      }

    }
    catch (error) {
      vscode.window.showErrorMessage(`Error calling the 'Mark as False Positive' API.: ${error}`);
    }
    vscode.window.showInformationMessage("Successfully marked finding as false positive.");
    // findingsView.refresh();
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
