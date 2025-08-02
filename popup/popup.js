import { storage } from "../utils/storage.js";
import { parallelMap } from "../utils/parallel.js";
import { enableElementSelection } from "../content-scripts/selection.js";

const DEFAULT_SELECTORS = [
  {selector : "nameButton", color :"red", tag: "", style: ""},
  {selector : "priceButton", color :"blue", tag: "", style: ""},
  {selector : "descriptionButton", color :"green", tag: "", style: ""},
]

async function initSelectors() {
  let selectors = await storage.get("ButtonSelectors");
  if(!selectors){
    await storage.set({ButtonSelectors: DEFAULT_SELECTORS});
    selectors = DEFAULT_SELECTORS;
    console.log("Default selectors initialized.");
  } 
  return selectors;
}

async function setupSelectionButtons(selectors){
  selectors.forEach((buttonConfig, index) => {
    const button = document.getElementById(buttonConfig.selector);
    if(!button) return;
    button.addEventListener("click", async ()=>{
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: enableElementSelection,
        args: [buttonConfig.color, index]
      });
    })
    document.querySelector(`#${buttonConfig.selector}`).textContent = buttonConfig.style || buttonConfig.tag || "select html tag";
  })
}

async function scrapeAllLinks() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{result: links}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => 
      Array.from(document.querySelectorAll("a[href]"))
        .map(a => a.href)
        .filter(href => href.startsWith("http") &&  !/^(javascript|mailto):/.test(href))   
  });
  return links;
}

async function scrapeUrl(url, selectors){
  return new Promise((resolve)=> {
    chrome.runtime.sendMessage({ type: "FETCH_HTML", url }, (response) => {
      if(chrome.runtime.lastError || !response.html){
        return resolve({url, error: response.error || chrome.runtime.lastError.message});
      }
      try{
        const doc = new DOMParser().parseFromString(response.html, "text/html");
        const [selName, selPrice, selDescription] = selectors;
        const getText = (config) => {
          const cleaned = (config.style || "")
            .split(/\s+/)
            .filter(c => c && c !== "__hover-highlight")
            .join(" ");
          let selector = "";
          if (config.tag) {
            selector += config.tag;
          }
          if (cleaned) {
            selector += cleaned
              .split(" ")
              .map(cls => "." + cls)
              .join("");
          }
          return doc.querySelector(selector)?.textContent.trim() || "";
        };
        const imgs = Array.from(doc.images)
          .map(img => img.src)
          .filter(src => src.startsWith("http") && !/^(javascript|data):/.test(src));
        
        resolve({
          url,
          name: getText(selName),
          price: getText(selPrice),
          description: getText(selDescription),
          images: imgs
        });
        document.querySelector(".counterDone").textContent = parseInt(document.querySelector(".counterDone").textContent) + 1;
      }catch(e){
        resolve({url, error: e.message});
        document.querySelector(".counterError").textContent = parseInt(document.querySelector(".counterError").textContent) + 1;
      }
    })
  })
}

async function onScrapeClick(selectors){
  document.querySelector(".primary").style.display = "none";
  document.querySelector(".secondary").style.display = "flex";
  document.querySelector(".counterDone").textContent = "0";
  document.querySelector(".counterError").textContent = "0";
  const links = await scrapeAllLinks();
  document.querySelector(".counterTotal").textContent = links.length;
  const results = await parallelMap(links, (url) => scrapeUrl(url, selectors), 5);
  document.querySelector(".secondary").style.display = "none";
  document.querySelector(".end").style.display = "flex";
  return results;
}

function onExportClick(results){
  const filtered = results.filter(r =>
    r.name && r.price && r.description && Array.isArray(r.images) && r.images.length > 0
  );
  console.log(`Total resultados: ${results.length}, válidos: ${filtered.length}`);
  const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "results.json"; a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", async () => {
  let selectors = await initSelectors();
  await setupSelectionButtons(selectors);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.ButtonSelectors) {
      selectors = changes.ButtonSelectors.newValue;
      setupSelectionButtons(selectors);    
    }
  });

  let scrapeResults = [];
  document.getElementById("scrapeButton")
    .addEventListener("click", async () => scrapeResults = await onScrapeClick(selectors));
  
  document.getElementById("exportButton")
    .addEventListener("click", () => onExportClick(scrapeResults));
})