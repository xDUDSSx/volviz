
export default function importFiles(obj, arr) {
    // r.keys().forEach((key) => (cthead[key] = r(key)));
    obj.keys().forEach((key) => (arr.push({name: key, data: obj(key)})));
}
