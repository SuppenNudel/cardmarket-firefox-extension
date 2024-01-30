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

async function parseCsvAndSave(fileContent) {
    // parse csv
    const parsedData = await parseCSV(fileContent);
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
}


(async function main() {
    console.log("loading popup script");

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv";

    const navElement = document.querySelector('nav[aria-label="breadcrumb"]')
    navElement.insertAdjacentElement("afterend", fileInput);

    // Add event listener for file selection
    fileInput.addEventListener('change', readFileContent);

    // Function to handle file selection
    function readFileContent(event) {
        // Check if any file is selected
        if (fileInput.files.length > 0) {
            // Get the selected file
            var file = fileInput.files[0];

            // Create a new FileReader
            var reader = new FileReader();

            // Define the onload event handler
            reader.onload = function (e) {
                // e.target.result contains the file content as a data URL
                var fileContent = e.target.result;

                // Display the file content (for demonstration purposes)
                console.log('File Content:', fileContent);

                parseCsvAndSave(fileContent);
            };

            // Read the file as text
            reader.readAsText(file);
        } else {
            console.log('No file selected.');
        }
    }

})();