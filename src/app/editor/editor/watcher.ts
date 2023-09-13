import { VanillaMirror } from './vanilla-mirror';

export class Watcher {

    isWatching = false;
    contentObserver: MutationObserver;

    constructor(private editor: VanillaMirror, public listener) {

    }

    startWatching = () => {
        this.stopWatching();
        this.isWatching = true;

        this.contentObserver = new MutationObserver(this.listener);
        this.contentObserver.observe(this.editor.$contentElt, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    stopWatching = () => {
        if (this.contentObserver) {
            this.contentObserver.disconnect();
            this.contentObserver = undefined;
        }
        this.isWatching = false;
    }

    noWatch = (cb) => {
        if (this.isWatching === true) {
            this.stopWatching();
            cb();
            this.startWatching();
        } else {
            cb();
        }
    }
}

