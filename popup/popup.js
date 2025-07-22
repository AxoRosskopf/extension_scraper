async function parallelMap(input, workerFn, concurrency = 4) {
    const results = [];
    const queue = [...input];

     const workers = Array(concurrency).fill(0).map(async () => {
         while (queue.length > 0) {
             const item = queue.shift();
             try {
              const result = await workerFn(item);
              results.push(result);
             } catch (error) {
              results.push({ error: error.message, item });
            } 
         }
     });

    await Promise.all(workers);
    return results;
}

document.getElementById("scrapeButton").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return Array.from(document.querySelectorAll("a[href]"))
                  .map(a => a.href);
    }
  });

  const links = injectionResult.result || [];
  if (links.length > 0) {
    
    const slidingLinks = links.slice(0, 100); // Adjust the number of links to scrape as needed

    const scrapeUrl = (url) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({type: "FETCH_HTML", url}, (response) => {
          if(chrome.runtime.lastError) {
            resolve({ url, imgs: [], error: chrome.runtime.lastError.message });
            return;
          }
          if(response?.html){
            try{
              const doc = new DOMParser().parseFromString(response.html, 'text/html');
              const imgs = Array.from(doc.querySelectorAll("img"))
                                .map(img => img.src);
              resolve({ url, imgs });
            } catch (error) {
              resolve({ url, imgs: [], error: error.message });
            }
          } else {
            resolve({ url, imgs: [], error: response?.error });
          }
        });
      });
    }
    const results = await parallelMap(links, scrapeUrl, 5);
    console.log(results);
  }
});