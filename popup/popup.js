let resultsGlobalVar = [];

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

  document.querySelector(".primary").style.display = "none";
  document.querySelector(".secondary").style.display = "flex";



  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return Array.from(document.querySelectorAll("a[href]"))
                  .map(a => a.href)
                  .filter(href => href.startsWith("http") && !href.includes("javascript:") && !href.includes("mailto:"));
    }
  });

  const links = injectionResult.result || [];
  if (links.length > 0) {
  
    document.querySelector(".counterTotal").textContent = links.length
    const scrapeUrl = (url) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({type: "FETCH_HTML", url}, (response) => {
          if(chrome.runtime.lastError) {
            resolve({ url, 
              name_product: "", 
              price: "",
              description: "",
              imgs: [], 
              error: chrome.runtime.lastError.message });
            return;
          }
          if(response?.html){
            try{
              const doc = new DOMParser().parseFromString(response.html, 'text/html');
              const nameProduct = doc.querySelector("h1, .product-title, .product-name")?.textContent.trim() || "";
              const price = doc.body.textContent.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g)[0] || "";
              const description = Array.from(doc.querySelectorAll("p"))
                                      .map(p => p.textContent.trim())
                                      .join("\n") || "";
              const imgs = Array.from(doc.querySelectorAll("img")) 
                                .map(img => img.src)
                                .filter(src => src.startsWith("http") && !src.includes("javascript:") && !src.includes("data:"));
              resolve({ url, name_product: nameProduct, price, description, imgs });
              document.querySelector(".counterDone").textContent = document.querySelector(".counterDone").textContent ? parseInt(document.querySelector(".counterDone").textContent) + 1 : 1;
            } catch (error) {
              resolve({ url, name_product: "", price: "", description: "", imgs: [], error: error.message });
              document.querySelector(".counterDone").textContent = document.querySelector(".counterDone").textContent ? parseInt(document.querySelector(".counterDone").textContent) + 1 : 1;
              document.querySelector(".counterDone").style.color = "red";
            }
          } else {
            resolve({ url, name_product: "", price: "", description: "", imgs: [], error: response?.error });
          }
        });
      });
    }
    const results = await parallelMap(links, scrapeUrl, 5);
    document.querySelector(".secondary").style.display = "none";
    document.querySelector(".end").style.display = "flex";
    resultsGlobalVar = results;
  }
});


document.getElementById("exportButton").addEventListener("click", () => {
const resultsFiltered = resultsGlobalVar.filter(result => 
    result.name_product?.trim() &&
    result.price?.trim() &&
    result.description?.trim() &&
    Array.isArray(result.imgs) &&
    result.imgs.length > 0
  );
  const blob = new Blob([JSON.stringify(resultsFiltered, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "results.json";
  a.click();
  URL.revokeObjectURL(url);
});