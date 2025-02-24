/**
 * This file houses the global keyboard commands and bindings.
 */

import { MatDialog } from '@angular/material/dialog';
import { CommandPaletteService, ThemeService } from '@dotglitch/ngx-common';
import { ConfigService } from 'src/app/services/config.service';
import { FilesService } from 'src/app/services/files.service';
import { PagesService } from 'src/app/services/pages.service';
import { UtilService } from 'src/app/services/util.service';

export const InitializeCommandPalette = (
    commandPalette: CommandPaletteService,
    pages: PagesService,
    config: ConfigService,
    utils: UtilService,
    files: FilesService,
    dialog: MatDialog,
    theme: ThemeService,
) => {
    // Force the refresh keybind for Tauri env
    commandPalette.attachElementCommands([
        {
            label: "Close the current open page",
            shortcutKey: 'ctrl+w',
            action: e =>
                pages.closeTab(pages.getFocusedTab())
        },
        {
            label: "Toggle DevTools",
            shortcutKey: 'f12',
            action: e =>
                window['electronGlobals']?.devTools()
        },
        {
            label: "Toggle Fullscreen",
            shortcutKey: 'f11',
            action: e =>
                window['electronGlobals']?.fullScreen()
        },
        {
            label: "Reload Window",
            shortcutKey: 'f5',
            action: e =>
                window.location.reload()
        },
        {
            label: "Switch to Dark theme",
            action: e =>
                theme.setTheme("dark")
        },
        {
            label: "Switch to Light theme",
            action: e =>
                theme.setTheme("light")
        }
    ]);
    commandPalette.initialize({
        keybind: "ctrl+p"
    })
}
