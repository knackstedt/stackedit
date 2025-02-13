import { Excalidraw, WelcomeScreen } from '@excalidraw/excalidraw';
import { ExcalidrawProps } from '@excalidraw/excalidraw/types/types';
import * as React from 'react';
import { FunctionComponent } from 'react';


export const WrappableComponent: FunctionComponent<any> = ({ props }: { props: ExcalidrawProps }) => {
    return (
        <Excalidraw { ...props as any }>
            <WelcomeScreen>
                <WelcomeScreen.Hints.MenuHint />
                <WelcomeScreen.Hints.ToolbarHint />
                <WelcomeScreen.Hints.HelpHint />

                <WelcomeScreen.Center>
                    <WelcomeScreen.Center.Logo />

                    {/* <WelcomeScreen.Center.Heading>
                        Create a Diagram with Excalidraw!
                    </WelcomeScreen.Center.Heading>
                    <h3>
                        Changes will be automatically saved.
                    </h3> */}
                    <WelcomeScreen.Center.Menu>
                        <WelcomeScreen.Center.MenuItem onSelect={null}>
                            Changes will be automatically saved.
                        </WelcomeScreen.Center.MenuItem>
                        <WelcomeScreen.Center.MenuItemLink icon={<img src="/assets/github-mark-white.svg" style={{ width: '20px', transform: 'translate(0, -4px)' }}/>} href="https://github.com/excalidraw/excalidraw">
                            Excalidraw GitHub
                        </WelcomeScreen.Center.MenuItemLink>
                        <WelcomeScreen.Center.MenuItemHelp />
                    </WelcomeScreen.Center.Menu>
                </WelcomeScreen.Center>
            </WelcomeScreen>
        </Excalidraw>
    );
};
