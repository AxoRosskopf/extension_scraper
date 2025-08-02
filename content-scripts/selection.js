export function enableElementSelection(color, buttonIndex){
    const styleTag = document.createElement("style");
    styleTag.textContent = `
    .__hover-highlight {
      outline: 2px solid ${color} !important;
      cursor: pointer !important;
    }`
    document.head.appendChild(styleTag);

    const cleanup = () => {
        document.removeEventListener("mouseover", mouseOver);
        document.removeEventListener("mouseout", mouseOut);
        document.removeEventListener("click", click, true);
        document.querySelectorAll(".__hover-highlight").forEach(el =>
          el.classList.remove("__hover-highlight")
        );
        styleTag.remove();
    }
    const mouseOver = (e) => {
        e.target.classList.add("__hover-highlight");
    };
    const mouseOut = (e) => {
        e.target.classList.remove("__hover-highlight");
    };
    function click(e){
        e.preventDefault();
        e.stopPropagation();
        const tag = e.target.tagName.toLowerCase() || "";
        const style = e.target.className || "";
        chrome.runtime.sendMessage({
            type: "ELEMENT_SELECTED",
            index: buttonIndex,
            tag: tag,
            style: style
        });
        cleanup();
    }
    document.addEventListener("mouseover", mouseOver);
    document.addEventListener("mouseout", mouseOut);
    document.addEventListener("click", click, true);

}

window.enableElementSelection = enableElementSelection;