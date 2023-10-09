
export const isGecko = 'MozAppearance' in document.documentElement.style;
export const isWebkit = 'WebkitAppearance' in document.documentElement.style;
export const isMsie = 'msTransform' in document.documentElement.style;
export const isMac = navigator.userAgent.indexOf('Mac OS X') !== -1;

export const defer = (() => {
    const queue = new Array(1000);
    let queueLength = 0;
    function flush() {
        for (let i = 0; i < queueLength; i += 1) {
            try {
                queue[i]();
            }
            catch (e) {
                console.error(e.message, e.stack);
            }
            queue[i] = undefined;
        }
        queueLength = 0;
    }

    let iterations = 0;
    const observer = new window.MutationObserver(flush);
    const node = document.createTextNode('');
    observer.observe(node, { characterData: true });

    return (fn) => {
        queue[queueLength] = fn;
        queueLength += 1;
        if (queueLength === 1) {
            iterations = (iterations + 1) % 2;
            node.data = iterations as any;
        }
    };
})();

export const debounce = <T = Function>(func: T, wait?): T => {
    let timeoutId;
    let isExpected;
    return (wait
        ? () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(func as any, wait);
        }
        : () => {
            if (!isExpected) {
                isExpected = true;
                defer(() => {
                    isExpected = false;
                    (func as any)();
                });
            }
        }) as any;
};


export const findContainer = (elt, offset) => {
    let containerOffset = 0;
    let container;
    let child = elt;
    let limit = 0;
    do {
        container = child;
        child = child.firstChild;
        if (child) {
            let limit = 0;
            do {
                const len = child.textContent.length;
                if (containerOffset <= offset && containerOffset + len > offset) {
                    break;
                }
                containerOffset += len;
                child = child.nextSibling;
            }
            while (child && limit++ < 10000);
        }
    }
    while (child && child.firstChild && child.nodeType !== 3 && limit++ < 10000);

    if (child) {
        return {
            container: child,
            offsetInContainer: offset - containerOffset,
        };
    }

    limit = 0;
    while (container.lastChild && limit++ < 10000) {
        container = container.lastChild;
    }
    return {
        container,
        offsetInContainer: container.nodeType === 3 ? container.textContent.length : 0,
    };
}


export class EventEmittingClass {
    private listenerMap = Object.create(null);

    $trigger(eventType, ...args) {
        const listeners = this.listenerMap[eventType];
        if (listeners) {
            listeners.forEach((listener) => {
                // try {
                listener.apply(this, args);
                // } catch (e) {
                //     // eslint-disable-next-line no-console
                //     console.error(e.message, e.stack);
                // }
            });
        }
    }

    on(eventType, listener) {
        let listeners = this.listenerMap[eventType];
        if (!listeners) {
            listeners = [];
            this.listenerMap[eventType] = listeners;
        }
        listeners.push(listener);
    }

    off(eventType, listener) {
        const listeners = this.listenerMap[eventType];
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
}
