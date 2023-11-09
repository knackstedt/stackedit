import { Excalidraw, WelcomeScreen, restoreAppState } from '@excalidraw/excalidraw';
import * as React from 'react';
import { FunctionComponent } from 'react';

export const WrappableComponent: FunctionComponent<any> = ({ props }) => {
    return (
        <Excalidraw
            { ...props as any }
        >
            <WelcomeScreen>
                <WelcomeScreen.Hints.MenuHint />
                <WelcomeScreen.Hints.ToolbarHint />
                <WelcomeScreen.Hints.HelpHint />

                <WelcomeScreen.Center>
                    <div>
                        Fuckin logo dude.
                    </div>
                    <WelcomeScreen.Center.Heading>
                        Welcome Screen Heading!
                    </WelcomeScreen.Center.Heading>
                    <WelcomeScreen.Center.Menu>
                        <WelcomeScreen.Center.MenuItemLink href="https://github.com/excalidraw/excalidraw">
                            Excalidraw GitHub
                        </WelcomeScreen.Center.MenuItemLink>
                        <WelcomeScreen.Center.MenuItemHelp />
                    </WelcomeScreen.Center.Menu>
                </WelcomeScreen.Center>
            </WelcomeScreen>
        </Excalidraw>
    );
};
