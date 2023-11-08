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
export class DiagramComponent implements OnInit {
    @ViewChild(ExcalidrawComponent) excalidrawWrapper: ExcalidrawComponent;

    @Input() page: Page;

    contentData: ExcalidrawInitialDataState = {};
    appState: Partial<AppState> = {};
    private subscriptions: Subscription[];

    private dataChangeEmitter = new BehaviorSubject(null);
    private dataChange$ = this.dataChangeEmitter.pipe(debounceTime(300));

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
        try {
            let data = JSON.parse(this.page.content);

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
        }
        catch(ex) {
            // TODO: consider resetting page value? May cause data loss.
            console.warn("Failed to deserialize JSON for page " + this.page.name)
        }
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
        this.page.content = JSON.stringify(this.dataChangeEmitter.value);
        console.log(this.page.content)

        return this.pages.savePage(this.page);
    }
}
