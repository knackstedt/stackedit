import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../../services/config.service';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-telemetry-dialog',
    templateUrl: './telemetry-dialog.component.html',
    styleUrls: ['./telemetry-dialog.component.scss'],
    imports: [
        MatButtonModule
    ],
    standalone: true
})
export class TelemetryDialogComponent implements OnInit {

    constructor(
        private readonly config: ConfigService,
        private readonly dialogRef: MatDialogRef<any>
    ) { }

    ngOnInit() {
    }

    async enable() {
        await this.config.set("telemetry", true);
        this.dialogRef.close();
    }
    async disable() {
        await this.config.set("telemetry", false);
        this.dialogRef.close();
    }
}
