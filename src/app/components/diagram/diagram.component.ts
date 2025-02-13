import { Component, Input, ViewChild } from '@angular/core';
import { AppState, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types/types';
import { BehaviorSubject, Subject, Subscription, debounceTime } from 'rxjs';
import { PagesService } from '../../services/pages.service';
import { Page } from '../../types/page';
import { ExcalidrawComponent } from './excalidraw.component';
import { loadLibs } from './libs';

@Component({
    selector: 'app-diagram',
    templateUrl: './diagram.component.html',
    styleUrls: ['./diagram.component.scss'],
    imports: [
        ExcalidrawComponent
    ],
    standalone: true
})
export class DiagramComponent {
    @ViewChild(ExcalidrawComponent) excalidrawWrapper: ExcalidrawComponent;

    private _page: Page;
    @Input() set page(value: Page) {
        this._page = value;
        this.ngOnInit();
    }
    get page() { return this._page }

    initialData: ExcalidrawInitialDataState;

    private subscriptions: Subscription[];
    private dataChangeEmitter = new Subject();
    private dataChange$ = this.dataChangeEmitter.pipe(debounceTime(300));
    private hasInitialized = false;
    private diagramData;

    constructor(
        public readonly pages: PagesService
    ) {
        this.subscriptions = [
            this.dataChange$.subscribe(d => {
                if (!d) return;

                this.saveState(this.diagramData = d);
            })
        ]
    }

    async ngOnInit() {
        if (!this.page.hasLoaded || !this.page.content) {
            await this.pages.loadPageContent(this.page);
        }

        const data = JSON.parse(this.page.content || '{}');

        const libItems = loadLibs()
            .then(l =>
                l
                .map(l => l['default'])
                .map(l => l['libraryItems'] || l['library'])
                .flat()
                .filter(i => !!i)
            );

        const appState: AppState = data.appState || {};
        appState.collaborators = new Map();

        this.initialData = {
            appState: appState,
            elements: data.elements,
            libraryItems: libItems,
            files: data.files
        };

        this.hasInitialized = true;
    }

    async ngOnDestroy() {
        this.subscriptions.forEach(s => s.unsubscribe());
        this.hasInitialized = false;
        return this.pages.onPageContentChange(this.page, this.diagramData);
    }

    onChange([elements, appState, files]) {
        if (this.hasInitialized) {
            this.dataChangeEmitter.next({
                elements,
                appState,
                files: {...files}
            });
        }
    }

    private saveState(value) {
        // Excalidraw emits an event that clears everything when the appState
        // is replaced, in order to mitigate that from wiping out our data
        // we'll disable that scenario manually.
        if (value.elements.length == 0 && this.initialData.elements.length > 0) {
            this.ngOnInit();
            return;
        }

        if (!this.hasInitialized || value == null) return;

        // console.log("Save diagram", this)
        return this.pages.onPageContentChange(this.page, JSON.stringify(value));
    }
}
