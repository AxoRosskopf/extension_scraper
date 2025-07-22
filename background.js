chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.type === "FETCH_HTML" && request.url){
        fetch(request.url)
            .then(res => res.text())
            .then(html => sendResponse({html}))
            .catch(error => sendResponse({error: error.message}));
        return true;
    }
});
