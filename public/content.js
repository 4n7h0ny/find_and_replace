function GetReplacedText(text, find, findRegex, ignoreCase, replace) {
  if (text == null) {
    return "";
  }

  let findResult = null;
  if (findRegex) {
    findResult = findRegex.exec(text);
  } else {
    let index;
    if (ignoreCase) {
      index = text.toLowerCase().indexOf(find.toLowerCase());
    } else {
      index = text.indexOf(find);
    }
    if (index != -1) {
      findResult = new Array();
      findResult.push(text.substring(index, index + find.length));
    }
  }
  if (findResult == null || findResult.length == 0) {
    return text;
  }
  let realReplace = replace;
  for (let k = 0; k < findResult.length; k++) {
    const param = "$" + k;
    if (realReplace.indexOf(param) != -1) {
      realReplace = realReplace.replaceAll(param, findResult[k]);
    }
  }
  const index = text.indexOf(findResult[0]) + findResult[0].length;
  const firstPart = text.substring(0, index);
  const secondPart = text.substring(index);
  return firstPart.replaceAll(findResult[0], realReplace) + GetReplacedText(secondPart, find, findRegex, ignoreCase, replace);
}

function GetReplaceResult(text, find, findRegex, ignoreCase, replace) {
  if (text == null) {
    return null;
  }

  let findResult = null;
  if (findRegex) {
    findResult = findRegex.exec(text);
  } else {
    let index;
    if (ignoreCase) {
      index = text.toLowerCase().indexOf(find.toLowerCase());
    } else {
      index = text.indexOf(find);
    }
    if (index != -1) {
      findResult = new Array();
      findResult.push(text.substring(index, index + find.length));
    }
  }
  if (findResult == null || findResult.length == 0) {
    return null;
  }
  let realReplace = replace;
  for (let k = 0; k < findResult.length; k++) {
    const param = "$" + k;
    if (realReplace.indexOf(param) != -1) {
      realReplace = realReplace.replaceAll(param, findResult[k]);
    }
  }
  let result = new Array();
  result.push(findResult[0]);
  result.push(realReplace);
  return result;
}

function DoTaskForElements(rootNode, find, findRegex, ignoreCase, replace, check, highlight) {
  const elements = rootNode.querySelectorAll("*");
  let findCount = 0;
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();
    if (tagName == "script" || tagName == "style" || tagName == "img") {
      continue;
    }
    const visible = element.offsetWidth > 0 && element.offsetHeight > 0 && getComputedStyle(element).visibility == "visible";
    if (!visible) {
      continue;
    }
    if (tagName == "input" || tagName == "textarea") {
      const text = element.value;
      const result = GetReplaceResult(text, find, findRegex, ignoreCase, replace);
      if (result == null) {
        continue;
      }
      if (replace == result[1] || text.indexOf(result[1]) == -1) {
        findCount = findCount + 1;
        if (highlight) {
          //do nothing
        } else if (check) {
          //do nothing
        } else {
          element.value = GetReplacedText(text, find, findRegex, ignoreCase, replace);
        }
      }
    } else if (element.childNodes.length > 0) {
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.nodeValue;
          const result = GetReplaceResult(text, find, findRegex, ignoreCase, replace);
          if (result == null) {
            continue;
          }
          if (replace == result[1] || text.indexOf(result[1]) == -1) {
            findCount = findCount + 1;
            if (highlight) {
              const html = element.innerHTML;
              const newHtml = html.replaceAll(result[0], `<span class="class_hl_find_and_replace" style="background-color:yellow">${result[0]}</span>`);
              element.innerHTML = newHtml;
              break;
            } else if (check) {
              // do nothing
            } else {
              node.nodeValue = GetReplacedText(text, find, findRegex, ignoreCase, replace);
            }
          }
        }
      }
    }
    if (element.shadowRoot) {
      findCount = findCount + DoTaskForElements(element.shadowRoot, find, findRegex, ignoreCase, replace, check, highlight);
    }
  }
  return findCount;
}

function RemoveHighLightElements() {
  while (true) {
    let hightLightElements = document.getElementsByClassName("class_hl_find_and_replace");
    if (hightLightElements.length == 0) {
      break;
    }
    for (const element of hightLightElements) {
      const parentNode = element.parentNode;
      parentNode.replaceChild(element.firstChild, element);
      parentNode.normalize();
    }
  }
}

function FindTextAndDo(find, regex, ignoreCase, wholeWord, replace, check, highlight) {
  let findRegex = null;
  if (regex || wholeWord) {
    try {
      const mode = ignoreCase === true ? "mi" : "m";
      if (wholeWord) {
        findRegex = new RegExp(`\\b${find}\\b`, mode);
      } else {
        findRegex = new RegExp(find, mode);
      }
    } catch (e) {
      return 0;
    }
  }
  return DoTaskForElements(document.body, find, findRegex, ignoreCase, replace, check, highlight);
}

function RepeatReplace(times) {
  if (times <= 4) {
    setTimeout(async function () {
      const runRule = rules => {
        for (const [find, value] of Object.entries(rules)) {
          if (value.domain != null && value.domain != window.location.host) {
            continue;
          }
          if (value.runtype != "Auto") {
            continue;
          }
          if (value.disabled == true) {
            continue;
          }
          FindTextAndDo(find, value.regex === true, value.ignoreCase === true, value.wholeWord === true, value.replace, false, false);
        }
      };

      const syncRules = await chrome.storage.sync.get(null);
      for (const rules of Object.values(syncRules)) {
        runRule(rules);
      }

      const localResult = await chrome.storage.local.get(["local"]);
      const localRules = localResult["local"] ?? {};
      for (const rules of Object.values(localRules)) {
        runRule(rules);
      }

      RepeatReplace(times + 1);
    }, times * 1000);
  }
}

function RealtimeReplace() {
  setTimeout(async function () {
    const runRule = rules => {
      for (const [find, value] of Object.entries(rules)) {
        if (value.domain != null && value.domain != window.location.host) {
          continue;
        }
        if (value.runtype != "Realtime") {
          continue;
        }
        if (value.disabled == true) {
          continue;
        }
        FindTextAndDo(find, value.regex === true, value.ignoreCase === true, value.wholeWord === true, value.replace, false, false);
      }
    };

    const syncRules = await chrome.storage.sync.get(null);
    for (const rules of Object.values(syncRules)) {
      runRule(rules);
    }

    const localResult = await chrome.storage.local.get(["local"]);
    const localRules = localResult["local"] ?? {};
    for (const rules of Object.values(localRules)) {
      runRule(rules);
    }

    RealtimeReplace();
  }, 1500);
}

async function main() {
  // commands
  const kRunRule = "run_rule";
  const kRunTest = "run_test";
  const kRunCheck = "run_check";
  const kHighLight = "run_highlight";

  const kCmd = "cmd";
  const kTmp = "tmp";

  const result = await chrome.storage.local.get([kCmd]);

  // Run automatic and realtime rules on first load
  if (!result.hasOwnProperty(kCmd)) {
    RepeatReplace(1);
    RealtimeReplace();
    return;
  }

  RemoveHighLightElements();
  chrome.storage.local.remove(kCmd);
  const cmd = result[kCmd];
  if (cmd.type == kRunRule) {
    let replaceCount = 0;

    const runRule = (result, cmdFind) => {
      for (const rules of Object.values(result)) {
        if (cmdFind == null) {
          for (const [find, value] of Object.entries(rules)) {
            if (value.domain != null && value.domain != window.location.host) {
              continue;
            }
            if (value.disabled == true) {
              continue;
            }
            replaceCount =
              replaceCount + FindTextAndDo(find, value.regex === true, value.ignoreCase === true, value.wholeWord === true, value.replace, false, false);
          }
        } else {
          const value = rules[cmdFind];
          if (value.domain != null && value.domain != window.location.host) {
            return;
          }
          if (value.disabled == true) {
            return;
          }
          replaceCount =
            replaceCount + FindTextAndDo(cmdFind, value.regex === true, value.ignoreCase === true, value.wholeWord === true, value.replace, false, false);
        }
      }
    };

    const syncRules = await chrome.storage.sync.get(cmd.group);
    runRule(syncRules, cmd.find);

    const localResult = await chrome.storage.local.get(["local"]);
    const localRules = localResult["local"] ?? {};
    runRule(localRules, cmd.find);

    chrome.runtime.sendMessage({ replaceCount: replaceCount });
  } else if (cmd.type == kRunTest) {
    const result = await chrome.storage.local.get([kTmp]);
    const rule = result[kTmp];
    if (rule == null || rule.valid == false) {
      return;
    }
    const value = rule.value;
    if (value.domain != null && value.domain != window.location.host) {
      return;
    }
    FindTextAndDo(rule.find, value.regex === true, value.ignoreCase === true, value.wholeWord === true, value.replace, false, false);
  } else if (cmd.type == kRunCheck) {
    const result = await chrome.storage.local.get([kTmp]);
    const rule = result[kTmp];
    let findCount = 0;
    if (rule == null || rule.valid == false) {
      findCount = 0;
    } else {
      const value = rule.value;
      if (value.domain != null && value.domain != window.location.host) {
        findCount = 0;
      } else {
        findCount = FindTextAndDo(rule.find, value.regex === true, value.ignoreCase === true, value.wholeWord === true, value.replace, true, false);
      }
    }
    chrome.runtime.sendMessage({ findCount: findCount });
  } else if (cmd.type == kHighLight) {
    const result = await chrome.storage.local.get([kTmp]);
    const rule = result[kTmp];
    if (rule == null || rule.valid == false) {
      return;
    }
    const value = rule.value;
    if (value.domain != null && value.domain != window.location.host) {
      return;
    }
    FindTextAndDo(rule.find, value.regex === true, value.ignoreCase === true, value.wholeWord === true, value.replace, false, true);
  }
}

main();
