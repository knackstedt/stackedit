import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ExcalidrawComponent } from './excalidraw.component';
import { Page } from '../../types/page';
import { PagesService } from '../../services/pages.service';
import { BehaviorSubject, Subscription, debounceTime } from 'rxjs';
import { AppState, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types/types';
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

    contentData: ExcalidrawInitialDataState = {};
    appState: Partial<AppState> = {};

    private subscriptions: Subscription[];
    private dataChangeEmitter = new BehaviorSubject(null);
    private dataChange$ = this.dataChangeEmitter.pipe(debounceTime(300));
    private hasInitialized = false;

    constructor(
        private readonly pages: PagesService
    ) {
        this.subscriptions = [
            this.dataChange$.subscribe(d => {
                if (!d) return;

                this.saveState();
            })
        ]
    }

    async ngOnInit() {
        if (!this.page.hasLoaded || !this.page.content) {
            await this.pages.loadPageContent(this.page);
        }

        let data = this.page.content as any;

        const libItems = loadLibs()
            .then(l =>
                l
                .map(l => l['default'])
                .map(l => l['libraryItems'] || l['library'])
                .flat()
                .filter(i => !!i)
            );

        this.contentData = {
            scrollToContent: true,
            elements: data.elements,
            libraryItems: libItems,
            files: data.files
        };
        this.appState = {
            frameRendering: {
                enabled: true
            } as any,
        }

        this.hasInitialized = true;
    }

    async ngOnDestroy() {
        await this.saveState();
        this.subscriptions.forEach(s => s.unsubscribe());
    }

    onChange([elements, appState, files]) {
        this.dataChangeEmitter.next({
            elements,
            appState,
            files: {...files}
        });
    }

    private saveState() {
        if (!this.hasInitialized) return null;

        return this.pages.onPageContentChange(this.page, this.dataChangeEmitter.value);
    }
}
