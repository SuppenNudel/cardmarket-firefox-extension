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

(async function main() {
    console.log("Loading background script");
})();



