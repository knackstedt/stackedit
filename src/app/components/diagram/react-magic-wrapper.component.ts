import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import { ThemeService } from '@dotglitch/ngx-common';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Subscription } from 'rxjs';

/**
 * Extend this component to automatically generate
 * bindings to a React component.
 *
 * ! You _must_ override the property `ngReactComponent`
 * Failure to do so will result in errors
 * e.g.
 * `override readonly ngReactComponent = ReactFlowWrappableComponent;`
 */
@Component({
    selector: 'app-react-magic-wrapper',
    template: ``,
    standalone: true
})
export class ReactMagicWrapperComponent implements OnChanges, OnDestroy, AfterViewInit {

    /**
     * The react component to be wrapped.
     * ! Must be overridden for this wrapper to work
     */
    ngReactComponent: React.FunctionComponent<any> | React.ComponentClass<any> | string;
    rootComponentInstance;

    private _root: Root;
    public theme: string;
    private ngSubscriptions: Subscription[];
    constructor(
        private ngContainer: ViewContainerRef,
        private ngTheme: ThemeService
    ) {
        this.ngSubscriptions = [
            this.ngTheme.subscribe(t => {
                this.theme = t;
                this.ngOnChanges();
            })
        ]
    }

    ngForceUpdate() {
        this.ngOnDestroy(true);
        this._root = undefined;
        this._render();
    }

    ngOnInit() {
        if (!this.ngReactComponent)
            throw new Error("ReactMagicWrapperComponent cannot start without a provided ngReactComponent!");
    }

    ngOnChanges(changes?: SimpleChanges): void {
        this._render();
    }

    ngAfterViewInit() {
        this._render();
    }

    ngOnDestroy(soft = false) {
        this._root.unmount();
        if (!soft)
            this.ngSubscriptions.forEach(s => s.unsubscribe());
    }

    private _render() {
        if (!this.ngReactComponent) return;
        if (!this._root) {
            this._root = createRoot(this.ngContainer.element.nativeElement);
        }

        // List all keys that do not start with `_` nor `ng`
        const keys = Object.keys(this).filter(k => !/^(?:_|ng)/.test(k));

        // Get all property keys from the class
        const propKeys = keys.filter(k => !k.startsWith("on"));
        // Get all event handler keys from the class
        const evtKeys = keys.filter(k => k.startsWith("on"));

        const props = {};
        // Project all key properties onto `props`
        propKeys.forEach(k => props[k] = this[k]);

        // Bind all event handlers.
        // ! important Angular uses EventEmitter, React uses
        // a different method of event binding
        evtKeys.forEach(k => props[k] = (...args) => this[k].next(args));

        this._root.render(this.rootComponentInstance = React.createElement(this.ngReactComponent, { props: props as any }));
    }
}
