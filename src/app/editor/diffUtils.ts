import DiffMatchPatch from 'diff-match-patch';

const diffMatchPatch = new DiffMatchPatch();
diffMatchPatch.Match_Distance = 10000;

const serializeObject = (obj: any) =>
    obj === undefined ? obj : JSON.stringify(obj, (key, value) => {
        if (Object.prototype.toString.call(value) !== '[object Object]') {
            return value;
        }
        // Sort keys to have a predictable result
        return Object.keys(value).sort().reduce((sorted, valueKey) => {
            sorted[valueKey] = value[valueKey];
            return sorted;
        }, {});
    });


function mergeValues(serverValue, clientValue, lastMergedValue) {
    if (!lastMergedValue) {
        return serverValue || clientValue; // Take the server value in priority
    }
    const newSerializedValue = serializeObject(clientValue);
    const serverSerializedValue = serializeObject(serverValue);
    if (newSerializedValue === serverSerializedValue) {
        return serverValue; // no conflict
    }
    const oldSerializedValue = serializeObject(lastMergedValue);
    if (oldSerializedValue !== newSerializedValue && !serverValue) {
        return clientValue; // Removed on server but changed on client
    }
    if (oldSerializedValue !== serverSerializedValue && !clientValue) {
        return serverValue; // Removed on client but changed on server
    }
    if (oldSerializedValue !== newSerializedValue && oldSerializedValue === serverSerializedValue) {
        return clientValue; // Take the client value
    }
    return serverValue; // Take the server value
}

export function mergeObjects(serverObject, clientObject, lastMergedObject = {}) {
    const mergedObject = {};
    Object.keys({
        ...clientObject,
        ...serverObject,
    }).forEach((key) => {
        const mergedValue = mergeValues(serverObject[key], clientObject[key], lastMergedObject[key]);
        if (mergedValue != null) {
            mergedObject[key] = mergedValue;
        }
    });
    return structuredClone(mergedObject);
}
