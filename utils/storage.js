export const storage = {
    get : (key) =>
    {
        new Promise((resolve) => {
            chrome.storage.local.get(key, (data) => resolve(data[key]));
        })
    },
    set: (items) => {
        new Promise((resolve) => {
            chrome.storage.local.set(items, () => resolve());
        })
    }
}