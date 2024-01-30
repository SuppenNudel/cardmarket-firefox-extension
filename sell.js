FROM = "From";
PRICE_TREND = "Price Trend";
AVG_30 = "30-days average price";
AVG_7 = "7-days average price";
AVG_1 = "1-day average price";
ITEMS = "Available items";

function calculateMedian(numbers) {
    numbers.sort(function (a, b) {
        return a - b;
    });

    var length = numbers.length;
    var middle = Math.floor(length / 2);

    if (length % 2 === 0) {
        return numbers[middle];
        //return (numbers[middle - 1] + numbers[middle]) / 2;
    } else {
        return numbers[middle];
    }
}


function parseCurrencyStringToDouble(currencyString) {
    // Remove non-numeric characters and the euro symbol
    var cleanedString = currencyString.replace(/[^\d,]/g, '');

    // Replace comma with a dot to make it a valid JavaScript number
    var numberString = cleanedString.replace(',', '.');

    // Parse the string to a floating-point number
    var result = parseFloat(numberString);

    return isNaN(result) ? null : result;
}

function createPriceDictionary(keys, values) {
    var resultDictionary = {};
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i].textContent.trim();
        var value = values[i].textContent.trim();
        if ([FROM, PRICE_TREND, AVG_1, AVG_7, AVG_30].includes(key)) {
            value = parseCurrencyStringToDouble(value);
        }
        resultDictionary[key] = value;
    }
    return resultDictionary;
}

function calcMyPrice() {
    // meta values
    infoListContainer = document.getElementById("tabContent-info").getElementsByClassName("info-list-container")[0];
    tableKeys = infoListContainer.getElementsByTagName("dt");
    tableValues = infoListContainer.getElementsByTagName("dd");
    map = createPriceDictionary(tableKeys, tableValues);

    // offers
    articleRows = document.getElementById("table").getElementsByClassName("article-row");
    var pricesList = [];
    for (var i = 0; i < articleRows.length && pricesList.length < 20; i++) {
        row = articleRows[i];
        sellerName = row.getElementsByClassName("seller-name")[0].innerText;
        if (sellerName == "NudelForce") {
            continue;
        }
        price = parseCurrencyStringToDouble(row.getElementsByClassName("price-container")[0].innerText);
        quantity = row.getElementsByClassName("col-offer")[0].getElementsByClassName("item-count")[0].innerText;

        for (var j = 0; j < quantity; j++) {
            pricesList.push(price);
        }
    }

    median = calculateMedian(pricesList) - 0.01;
    console.log(`Median: ${median}`);

    max = Math.max(map[FROM], map[PRICE_TREND], map[AVG_30], map[AVG_7], median); //, map[AVG_1]
    console.log(`Calculated max: ${max}`);
    rounded = Math.ceil(max * 100) / 100;
    console.log(`Rounded: ${rounded}`);
    return rounded;
}

function parseMkmIdFromImgSrc(imgSrc) {
    var matches = imgSrc.match(/\/(\w+)\/(\d+)\//);
    if (matches && matches.length === 3) {
        var setCode = matches[1]; // "LCC"
        var mkmId = matches[2]; // "744721"
        return mkmId;
    } else {
        throw new Error("No match found. Error parsing setCode and mkmId from image url: " + imgSrc);
    }
}

function findObjectsByScryfallId(collection, targetScryfallId) {
    const resultObjects = [];

    for (const key in collection) {
        const array = collection[key];
        for (const obj of array) {
            if (obj["Scryfall ID"] === targetScryfallId) {
                resultObjects.push(obj);
            }
        }
    }

    return resultObjects.length > 0 ? resultObjects : null;
}

HEADERS = ["Binder Name", "Foil", "Quantity", "Purchase price", "Misprint", "Altered", "Condition", "Language"];

function generateTable(cards) {
    const table = document.createElement('table');

    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.marginBottom = '20px';
    table.style.border = '1px solid black';

    // th, td {
    //     border: 1px solid #ddd;
    //     padding: 8px;
    //     text - align: left;
    // }

    //     th {
    //     background - color: #f2f2f2;
    // };

    // Create thead
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const header of HEADERS) {
        const th = document.createElement('th');
        th.textContent = header == "Misprint" ? "Condition checked" : header;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create tbody
    const tbody = document.createElement('tbody');
    for (const card of cards) {
        if (card["Binder Type"] == "list") {
            continue;
        }
        const row = document.createElement('tr');
        row.value = card;
        for (const key of HEADERS) {
            const value = card[key];
            const td = document.createElement('td');
            row.appendChild(td);
            var element = undefined;
            if (key == "Language") {
                element = document.createElement('span');
                element.style.display = "inline-block";
                element.style.width = "16px";
                element.style.height = "16px";
                element.style.backgroundImage = "url('//static.cardmarket.com/img/949ba8e63eca06832acdfff64020fea8/spriteSheets/ssMain2.png')";
                element.style.backgroundPosition = LANG_POS_MAP[value];
            } else if (key == "Condition") {
                // <span class="article-condition condition-nm"><span class="badge">NM</span></span>
                element = document.createElement('span');
                element.classList.add("article-condition");
                element.classList.add(`condition-${CONDITION_MAP[value].toLowerCase()}`);
                const childSpan = document.createElement('span');
                childSpan.classList.add("badge");
                childSpan.textContent = CONDITION_MAP[value];
                element.appendChild(childSpan);
            } else {
                if (key == "Misprint") {
                    td.textContent = !value;
                } else {
                    td.textContent = value;
                }
                if (key == "Binder Name") {
                    const binderType = card["Binder Type"];
                    if (binderType == "deck") {
                        td.textContent = "DECK - " + td.textContent;
                    }
                }
            }
            if (element) {
                td.appendChild(element);
            }
        }
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    return table;
}

const LANG_MAP = {
    "en": 1,
    "fr": 2,
    "de": 3,
    "ja": 7
}

const LANG_POS_MAP = {
    "en": "-16px -0px",
    "de": "-80px -0px"
}

const CONDITION_MAP = {
    "near_mint": "NM",
    "excellent": "EX"
}

function setValue(elementName, type, value) {
    console.log(`set value of ${elementName} through ${type}: ${value}`);
    input = document.querySelector(`input[name="${elementName}"]`);
    input[type] = value;
}

function fillMetrics(card) {
    var isFoil;
    if (card.Foil == "normal") { // foil
        isFoil = false;
    } else if (card.Foil == "foil") {
        isFoil = true;
    } else {
        throw new Error("Foil value is not valid: " + card.Foil);
    }
    setValue("isFoil", "checked", isFoil);
    setValue("amount", "value", card.Quantity);

    document.getElementById("language").value = LANG_MAP[card.Language];
    document.getElementById("condition").value = CONDITION_MAP[card.Condition];

    var isAltered;
    if (card.Altered == "false") { // altered
        isAltered = false;
    } else if (card.Altered == "true") {
        isAltered = true;
    } else {
        throw new Error("Altered value is not valid: " + card.Altered);
    }
    setValue("isAltered", "checked", isAltered);
}

function collectionLoaded(collection) {
    var img = document.querySelector("#image img:not(.lazy)");
    var src = img.src;
    var mkmId = parseMkmIdFromImgSrc(src);

    var div = document.createElement("div");
    var mainContent = document.getElementById("mainContent");
    mainContent.parentElement.insertBefore(div, mainContent);

    fetch(`https://api.scryfall.com/cards/cardmarket/${mkmId}`)
        .then(response => response.json())
        .then(cardObject => {
            var scryfallId = cardObject.id;
            if (!scryfallId) {
                // TODO put this error on the web page
                console.log(`Error when requesting cardmarket id ${mkmId}:`, cardObject.details);
                return;
            }
            var cards = findObjectsByScryfallId(collection, scryfallId);

            var table = generateTable(cards);
            div.appendChild(table);

            table.addEventListener('click', function (event) {
                const targetRow = event.target.closest('tr');

                if (targetRow) {
                    // Access data from the clicked row
                    const card = targetRow.value;
                    fillMetrics(card);
                }
            });
        });
}

(async function main() {
    // Retrieve data from local storage
    browser.storage.local.get('collection')
        .then((result) => {
            const collection = result.collection;
            console.log('Retrieved data:', collection);
            collectionLoaded(collection);
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });

    let priceField = document.getElementById("price");
    if (priceField) {
        myPrice = calcMyPrice();
        priceField.value = myPrice;
    }
})();