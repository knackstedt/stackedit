import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { WrappableComponent } from './excalidraw';
import { ForwardRef } from '@excalidraw/excalidraw/types/utility-types';
import { AppState, BinaryFiles, ExcalidrawAPIRefValue, ExcalidrawInitialDataState, Gesture, LibraryItems, PointerDownState, UIAppState } from '@excalidraw/excalidraw/types/types';
import { ExcalidrawElement, ExcalidrawEmbeddableElement, NonDeleted, NonDeletedExcalidrawElement, Theme } from '@excalidraw/excalidraw/types/element/types';
import { ClipboardData } from '@excalidraw/excalidraw/types/clipboard';
import { Language } from '@excalidraw/excalidraw/types/i18n';
import { ReactMagicWrapperComponent } from './react-magic-wrapper.component';

// https://infoheap.com/online-react-jsx-to-javascript/

@Component({
    selector: 'app-excalidraw',
    template: ``,
    styleUrls: ['./excalidraw.component.scss'],
    standalone: true,
    encapsulation: ViewEncapsulation.None
})
export class ExcalidrawComponent extends ReactMagicWrapperComponent {
    override readonly ngReactComponent = WrappableComponent;

    @Input() initialData?: ExcalidrawInitialDataState | null | Promise<ExcalidrawInitialDataState | null>;
    @Input() appState?: Object;
    @Input() excalidrawRef?: ForwardRef<ExcalidrawAPIRefValue>;
    @Input() isCollaborating?: boolean;
    @Input() langCode?: Language["code"];
    @Input() viewModeEnabled?: boolean;
    @Input() zenModeEnabled?: boolean;
    @Input() gridModeEnabled?: boolean;
    @Input() libraryReturnUrl?: string;
    @Input() name?: string;
    // @Input() UIOptions?: Partial<unknown>;
    @Input() detectScroll?: boolean;
    @Input() handleKeyboardGlobally?: boolean;
    @Input() autoFocus?: boolean;

    // children?: React.ReactNode;
    // validateEmbeddable?: boolean | string[] | RegExp | RegExp[] | ((link: string) => boolean | undefined);

    @Output() onChange = new EventEmitter<[elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles]>();
    // @Output() onPointerUpdate = new EventEmitter<{ payload: {
    //     pointer: {
    //         x: number;
    //         y: number;
    //     };
    //     button: "down" | "up";
    //     pointersMap: Gesture["pointers"];
    // }) => void;
    @Output() onPaste = new EventEmitter<[ data: ClipboardData, event: ClipboardEvent | null ]>();
    // @Output() renderTopRightUI = new EventEmitter<[ isMobile: boolean, appState: UIAppState ]>();
    // @Output() renderCustomStats = new EventEmitter<[ elements: readonly NonDeletedExcalidrawElement[], appState: UIAppState ]>();
    @Output() onLibraryChange = new EventEmitter<[ libraryItems: LibraryItems ]>();
    // @Output() generateIdForFile = new EventEmitter<[ file: File ]>();
    @Output() onLinkOpen = new EventEmitter<[ element: NonDeletedExcalidrawElement, event: CustomEvent ]>();
    @Output() onPointerDown = new EventEmitter<[ activeTool: AppState["activeTool"], pointerDownState: PointerDownState ]>();
    @Output() onScrollChange = new EventEmitter<[ scrollX: number, scrollY: number ]>();
    // @Output() renderEmbeddable = new EventEmitter<[ element: NonDeleted<ExcalidrawEmbeddableElement>, appState: AppState ]>();
}
