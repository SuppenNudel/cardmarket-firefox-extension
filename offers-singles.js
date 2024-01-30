function mapDataToName(dataArray) {
    const groupedData = {};

    dataArray.forEach(data => {
        if ('Name' in data) {
            const name = data.Name;

            // If the name doesn't exist in the groupedData, create an array
            if (!groupedData[name]) {
                groupedData[name] = [];
            }

            // Push the current data into the array under the name key
            groupedData[name].push(data);
        } else {
            console.error("Invalid data format. Expected 'Name' property.");
        }
    });

    return groupedData;
}

function parseCSV(fileContent) {
    return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
            header: true,
            complete: function (result) {
                console.log("csv parsing finished");
                resolve(result.data);
            },
            error: function (error) {
                reject(error);
            }
        });
    });
}

function handleCsv(csvFile) {
    const reader = new FileReader();

    reader.onload = async function (e) {
        const csvData = e.target.result;
        // parse csv
        const parsedData = await parseCSV(csvData);
        console.log(parsedData);

        // map csv to dict
        const collection = mapDataToName(parsedData);
        console.log(collection);

        // save collection dict to local storage
        browser.storage.local.set({ collection: collection })
            .then(() => {
                console.log('Data saved successfully');
            })
            .catch((error) => {
                console.error('Error saving data:', error);
            });
    };

    reader.readAsText(csvFile);
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

function getColorBasedOnPercentageRange(referencePrice, priceToCompare) {
    // Calculate the upper and lower bounds
    var upperBound = referencePrice * (1 + 10 / 100);
    var lowerBound = referencePrice * (1 - 10 / 100);

    // Check if priceToCompare is within the range
    if (priceToCompare < lowerBound) {
        return 'green'; // Price is lower
    } else if (priceToCompare <= upperBound) {
        return 'orange'; // Price is within bounds
    } else if (priceToCompare > upperBound) {
        return 'red'; // Price is higher
    } else {
        return 'blue';
    }
}

async function changePreviewImage(thumbnailElement, imgTag) {
    // Create a new DOMParser
    var parser = new DOMParser();
    // Parse the HTML string to create a Document
    var doc = parser.parseFromString(imgTag, 'text/html');
    // Access the created element
    var paragraph = doc.body.firstChild;
    paragraph.height = 150;

    thumbnailElement.innerHTML = '';
    thumbnailElement.appendChild(paragraph);
    thumbnailElement.style.width = "7.0rem";
}

function waitForElement() {
    var element = document.getElementById('yourElementId');
    if (element) {
        // Your code here
    } else {
        setTimeout(waitForElement, 100); // Check again in 100 milliseconds
    }
}

function showPreviewImage(articleRow) {
    let thumbnailElement = articleRow.getElementsByClassName("col-thumbnail")[0];
    if (!thumbnailElement) {
        setTimeout(function () {
            console.log("This code runs after 100 milliseconds");
        }, 100);
        return showPreviewImage(articleRow);
    }
    let thumbnailIconElement = thumbnailElement.getElementsByClassName("thumbnail-icon")[0];
    let imgTag = thumbnailIconElement.ariaLabel;

    var matches = imgTag.match(/\/(\w+)\/(\d+)\//);
    if (matches && matches.length === 3) {
        var setCode = matches[1]; // "LCC"
        var mkmId = matches[2]; // "744721"
    } else {
        throw new Error("No match found. Error parsing setCode and mkmId from image url: " + imgTag);
    }
    changePreviewImage(thumbnailElement, imgTag);
    return mkmId;
}

function normalizeCardname(cardNameElement) {
    let mkmCardName = cardNameElement.innerText;
    var indexOfParenthesis = mkmCardName.indexOf('(');
    if (indexOfParenthesis !== -1) {
        mkmCardName = mkmCardName.slice(0, indexOfParenthesis).trim();
    }
    return mkmCardName;
}

async function checkOwnership(collection, mkmCardName, cardObject) {
    if (collection) {
        let collCards = collection[mkmCardName];
        if (collCards) {
            let sum = {
                'de': 0,
                'en': 0
            }

            let sumPrinting = {
                'de': 0,
                'en': 0
            }

            for (let collCard of collCards) {
                sum[collCard.Language] += parseInt(collCard.Quantity);
                if (collCard["Scryfall ID"] == cardObject.id) {
                    sumPrinting[collCard.Language] += parseInt(collCard.Quantity);
                }
            }
            return `${sum.en + sum.de} (en: ${sum.en}, de: ${sum.de})<br>printing: ${sumPrinting.en + sumPrinting.de} (en: ${sumPrinting.en}, de: ${sumPrinting.de})`;
        } else {
            return 'unowned';
        }
    } else {
        return '<collection not loaded>';
    }
}

async function checkPrice(articleRow, cardObject) {
    prices = cardObject.prices;

    var productAttributesElement = articleRow.querySelector('.product-attributes');
    var foilElement = productAttributesElement.querySelector('[aria-label="Foil"]');
    var isFoil = false;
    if (foilElement) {
        isFoil = true;
    }
    price = prices[isFoil ? "eur_foil" : "eur"];

    var priceContainer = articleRow.getElementsByClassName("price-container")[0].getElementsByClassName("align-items-center")[0];
    priceContainer.classList.remove("d-flex");
    offerElement = priceContainer.getElementsByTagName("span")[0];
    currStr = offerElement.innerText;
    offer = parseCurrencyStringToDouble(currStr);

    priceContainer.appendChild(document.createElement("br"));
    var div = document.createElement("div");
    priceContainer.appendChild(div);

    if (price) {
        div.innerText = price;
        offerElement.classList.remove("color-primary");
        color = getColorBasedOnPercentageRange(price, offer);
        offerElement.style.color = color;
    } else {
        div.innerText = "n/a";
    }
}

async function updateContentOfCard(articleRow, collection) {
    let cardNameElement = articleRow.getElementsByClassName("col-seller")[0];
    // enables line break
    cardNameElement.style.display = "-webkit-box";

    var mkmCardName = normalizeCardname(cardNameElement);
    var mkmId = showPreviewImage(articleRow);

    // ignore basic lands
    if (["Plains", "Island", "Swamp", "Mountain", "Forest"].includes(mkmCardName)) {
        return;
    }

    var response = await fetch(`https://api.scryfall.com/cards/cardmarket/${mkmId}`);

    if (!response.ok) {
        var scryfallId = cardmarketMapping[mkmId];
        if (scryfallId) {
            console.log(`Din't find ${mkmCardName} via cardmarket-id ${mkmId}, trying with mapping`);
            response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch card details for ${mkmCardName} via scryfallId (${scryfallId}). Status: ${response.status}`);
            }
        } else {
            throw new Error(`Failed to fetch card details for ${mkmCardName} via cardmaketId (${mkmId}). Status: ${response.status}`);
        }
    }

    const cardObject = await response.json();
    if (!cardObject) {
        throw new Error(`Failed to jsonize response for ${mkmCardName} (${mkmId}).`);
    }

    checkOwnership(collection, mkmCardName, cardObject)
        .then(text => cardNameElement.innerHTML += `<br>${text}`);

    checkPrice(articleRow, cardObject);
}

async function updateContent(collection) {
    let table = document.getElementById("UserOffersTable"); // div
    let articleRows = table.getElementsByClassName("article-row");
    for (let articleRow of articleRows) {
        updateContentOfCard(articleRow, collection);
    }
}

function addFileInput() {
    var input = document.getElementById("csvFile");
    if (!input) {
        input = document.createElement("input");
        input.type = "file";
        input.id = "csvFile";
        input.accept = ".csv";
        var h1 = document.querySelector('div.page-title-container > div > h1');
        h1.appendChild(input);
    }
    return input;
}

(async function main() {
    // var input = addFileInput();

    /*
    input.addEventListener('change', function () {
        var selectedFile = input.files[0];
        console.log(`file selected: `, selectedFile);
        handleCsv(selectedFile);
    
        // Update UI
        input.textContent = `Selected File: ${selectedFile.name}`
    });
    */

    // Retrieve data from local storage
    browser.storage.local.get('collection')
        .then((result) => {
            const collection = result.collection;
            console.log('Retrieved data:', collection);
            updateContent(collection);
        })
        .catch((error) => {
            console.error('Error retrieving data:', error);
        });
})();