# defect-dojo-vscode-plugin

## Overview

The defect-dojo-vscode-plugin offers integration with Defect Dojo through VSCode. The idea is that the developer doesn't need to leave their 'environment' to interact with Defect Dojo.

## Features

After performing the configurations, product details and their open 'findings' will be displayed.

Upon clicking on a finding, the file will open on the line where the finding is located. The details of that finding will be displayed for 5 seconds, after which the description will disappear.

![Feature Open Finding](https://github.com/zani0x03/defect-dojo-vscode-plugin/blob/main/resources/images/readme/feature_open_finding.png)

By right-clicking on a finding, it's possible to mark it as a false positive.

![Feature Mark False Positive](https://github.com/zani0x03/defect-dojo-vscode-plugin/blob/main/resources/images/readme/feature_mark_false_positive.png)

## Extension Settings

Three settings need attention to get up and running.

`Token`

API Token for communication with the Defect Dojo API.

![API Token Setup](https://github.com/zani0x03/defect-dojo-vscode-plugin/blob/main/resources/images/readme/config_token.png)


`BaseUrl`

Base URL of Defect Dojo.

`ProductName`

Name of the product for which you want to view findings. For proper functionality, the product name must be related to the source code that will be opened in Visual Studio Code.

![Config Settings](https://github.com/zani0x03/defect-dojo-vscode-plugin/blob/main/resources/images/readme/config_settings.png)

## Known Issues
- If your product has more than 25 vulnerabilities, only the first 25 will be displayed;
- To improve the display of the finding description, currently it is shown for 5 seconds and then disappears. The idea is to show the description when hovering the mouse over the line of the finding.

## Release Notes

### 1.0.0

Initial release of defect-dojo-vscode-plugin