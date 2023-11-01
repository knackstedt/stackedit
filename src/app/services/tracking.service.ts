import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';

declare const dtrum;

@Injectable({
    providedIn: 'root'
})
export class TrackingService {

    constructor(
        private readonly config: ConfigService
    ) {
        config.subscribe(c => {
            c.telemetry ? dtrum?.enable() : dtrum?.disable();
        })
    }
}
