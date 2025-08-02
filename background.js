chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.type === "FETCH_HTML" && request.url){
        fetch(request.url)
            .then(res => res.text())
            .then(html => sendResponse({html}))
            .catch(error => sendResponse({error: error.message}));
    } else if(request.type === "ELEMENT_SELECTED" && request.index !== undefined) {
        const { index, tag, style } = request;

        chrome.storage.local.get(['ButtonSelectors'], (result) => {
            const data = result.ButtonSelectors || [];
            if(data[index]){
                data[index].tag = tag;
                data[index].style = style;
            }
            chrome.storage.local.set({ ButtonSelectors: data }, () => {
                console.log("Element updated in storage:", data[index]);
            });
        })
    }
    return true;
});
